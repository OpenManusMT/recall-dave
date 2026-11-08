/**
 * Review scheduling.
 *
 * Two schedules are computed for every key idea and BOTH are stored:
 *
 * 1. `authoritativeNextAt` — a transparent, non-AI fixed-step schedule
 *    (1, 3, 7, 14, 30, 60, 120 days). This is the only schedule that decides
 *    what appears under "Reviews due" in this release.
 *
 * 2. `recommendedNextAt` — an FSRS-4.5-style difficulty/stability/
 *    retrievability model with published default parameters. It runs in
 *    SHADOW MODE: it is logged for later comparison but never changes the real
 *    schedule. Promotion requires the original pack's Gate F (A001 pass on a
 *    real scorer + human-labelled answers + shadow discrepancy review + an
 *    explicit recorded product decision). None of those are met.
 *
 * These are engineering defaults, not clinically validated intervals.
 */
import type { ClueLevel, FsrsState, Grade, IdeaOutcome, MemoryState } from './types';
import { calendarDaysBetween, daysBetween, dueDayStart, toISO } from './dates';

export const FALLBACK_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30, 60, 120];

/** FSRS-4.5 default weights (open-spaced-repetition reference implementation). */
export const FSRS_DEFAULT_WEIGHTS: readonly number[] = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];
export const FSRS_DECAY = -0.5;
export const FSRS_FACTOR = 19 / 81;
export const DESIRED_RETENTION = 0.9;

const GRADE_VALUE: Record<Grade, 1 | 2 | 3 | 4> = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

/**
 * Map an observed idea check to a review grade (03-ADAPTIVE-ALGORITHM.md §6):
 * fail or source reveal → AGAIN; substantial cues → HARD; correct with little
 * or no support → GOOD; strong independent recall after a meaningful interval → EASY.
 */
export function mapGrade(
  outcome: IdeaOutcome,
  clueLevel: ClueLevel,
  elapsedDays: number | null,
): Grade {
  if (outcome === 'incorrect' || clueLevel >= 4) return 'AGAIN';
  if (clueLevel >= 2 || outcome === 'partial') return 'HARD';
  if (clueLevel === 0 && outcome === 'correct' && elapsedDays !== null && elapsedDays >= 3)
    return 'EASY';
  return 'GOOD';
}

/** Initial-scheduler recall strength by clue level (03 §5, configurable). */
export const RECALL_STRENGTH: Record<ClueLevel, number> = {
  0: 1,
  1: 0.85,
  2: 0.65,
  3: 0.4,
  4: 0.2,
  5: 0,
};

// ---------------------------------------------------------------- FSRS model

const clampD = (d: number) => Math.min(10, Math.max(1, d));

export function fsrsRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FSRS_FACTOR * Math.max(0, elapsedDays)) / stability, FSRS_DECAY);
}

/** Interval (days) at which retrievability falls to the desired retention. */
export function fsrsInterval(stability: number, retention = DESIRED_RETENTION): number {
  return (stability / FSRS_FACTOR) * (Math.pow(retention, 1 / FSRS_DECAY) - 1);
}

function initDifficulty(g: number, w: readonly number[]): number {
  return clampD((w[4] as number) - (g - 3) * (w[5] as number));
}

export function fsrsInit(grade: Grade, w: readonly number[] = FSRS_DEFAULT_WEIGHTS): FsrsState {
  const g = GRADE_VALUE[grade];
  return {
    difficulty: initDifficulty(g, w),
    stability: Math.max(0.1, w[g - 1] as number),
    reps: 1,
    lapses: grade === 'AGAIN' ? 1 : 0,
  };
}

export function fsrsNext(
  s: FsrsState,
  grade: Grade,
  elapsedDays: number,
  w: readonly number[] = FSRS_DEFAULT_WEIGHTS,
): { state: FsrsState; retrievability: number } {
  const g = GRADE_VALUE[grade];
  const R = fsrsRetrievability(elapsedDays, s.stability);
  // Same-day repetition: FSRS-4.5 does not update long-term memory state.
  if (elapsedDays < 1) return { state: { ...s, reps: s.reps + 1 }, retrievability: R };
  const D = s.difficulty;
  const d1 = D - (w[6] as number) * (g - 3);
  const difficulty = clampD((w[7] as number) * initDifficulty(4, w) + (1 - (w[7] as number)) * d1);
  let stability: number;
  if (g === 1) {
    stability =
      (w[11] as number) *
      Math.pow(D, -(w[12] as number)) *
      (Math.pow(s.stability + 1, w[13] as number) - 1) *
      Math.exp((w[14] as number) * (1 - R));
    stability = Math.min(stability, s.stability);
  } else {
    const hardPenalty = g === 2 ? (w[15] as number) : 1;
    const easyBonus = g === 4 ? (w[16] as number) : 1;
    stability =
      s.stability *
      (1 +
        Math.exp(w[8] as number) *
          (11 - D) *
          Math.pow(s.stability, -(w[9] as number)) *
          (Math.exp((w[10] as number) * (1 - R)) - 1) *
          hardPenalty *
          easyBonus);
  }
  return {
    state: {
      difficulty,
      stability: Math.max(0.1, stability),
      reps: s.reps + 1,
      lapses: s.lapses + (g === 1 ? 1 : 0),
    },
    retrievability: R,
  };
}

// ------------------------------------------------- fixed-step (authoritative)

export function nextFallbackStep(currentStep: number | null, grade: Grade): number {
  const last = FALLBACK_INTERVALS_DAYS.length - 1;
  if (currentStep === null) return 0; // first exposure: always check again tomorrow
  switch (grade) {
    case 'AGAIN':
      return 0;
    case 'HARD':
      return Math.min(currentStep, last);
    case 'GOOD':
      return Math.min(currentStep + 1, last);
    case 'EASY':
      return Math.min(currentStep + 2, last);
  }
}

export interface ScheduleUpdate {
  state: MemoryState;
  grade: Grade;
  elapsedDays: number | null;
  retrievabilityBefore: number | null;
}

/** Create the memory state for an idea seen for the first time. */
export function scheduleFirstExposure(params: {
  ideaId: string;
  chunkId: string;
  documentId: string;
  isProbe: boolean;
  outcome: IdeaOutcome;
  clueLevel: ClueLevel;
  now: Date;
}): ScheduleUpdate {
  const { now } = params;
  const grade = mapGrade(params.outcome, params.clueLevel, null);
  const step = nextFallbackStep(null, grade);
  const fsrs = fsrsInit(grade);
  const shadowDays = Math.max(1, Math.round(fsrsInterval(fsrs.stability)));
  const independent = params.clueLevel === 0 && params.outcome === 'correct';
  return {
    grade,
    elapsedDays: null,
    retrievabilityBefore: null,
    state: {
      id: params.ideaId,
      chunkId: params.chunkId,
      documentId: params.documentId,
      isProbe: params.isProbe,
      firstSeenAt: toISO(now),
      lastReviewAt: toISO(now),
      reviewCount: 0,
      independentCount: independent ? 1 : 0,
      highestClue: params.clueLevel,
      clueHistory: [params.clueLevel],
      step,
      authoritativeNextAt: toISO(dueDayStart(now, FALLBACK_INTERVALS_DAYS[step] as number)),
      fsrs,
      retrievability: 1,
      recommendedNextAt: toISO(dueDayStart(now, shadowDays)),
      mode: 'shadow',
    },
  };
}

/** Update a memory state after a later retrieval attempt (review). */
export function scheduleReview(
  prev: MemoryState,
  outcome: IdeaOutcome,
  clueLevel: ClueLevel,
  now: Date,
): ScheduleUpdate {
  // Elapsed time is counted in local calendar days, matching due dates (which fall at local
  // midnight): an evening reading reviewed the next morning counts as next-day (1), not 0.46.
  const elapsed = Math.max(0, calendarDaysBetween(new Date(prev.lastReviewAt), now));
  const grade = mapGrade(outcome, clueLevel, elapsed);
  const sameDay = elapsed < 1;
  // Same-day re-practice does not advance the authoritative schedule either.
  const step = sameDay && grade !== 'AGAIN' ? prev.step : nextFallbackStep(prev.step, grade);
  const { state: fsrs, retrievability } = fsrsNext(prev.fsrs, grade, elapsed);
  const shadowDays = Math.max(1, Math.round(fsrsInterval(fsrs.stability)));
  const independent = clueLevel === 0 && outcome === 'correct';
  return {
    grade,
    elapsedDays: elapsed,
    retrievabilityBefore: retrievability,
    state: {
      ...prev,
      lastReviewAt: toISO(now),
      reviewCount: prev.reviewCount + 1,
      independentCount: prev.independentCount + (independent ? 1 : 0),
      highestClue: Math.max(prev.highestClue, clueLevel) as ClueLevel,
      clueHistory: [...prev.clueHistory, clueLevel].slice(-30),
      step,
      authoritativeNextAt: toISO(dueDayStart(now, FALLBACK_INTERVALS_DAYS[step] as number)),
      fsrs,
      retrievability,
      recommendedNextAt: toISO(dueDayStart(now, shadowDays)),
    },
  };
}

export function isDue(state: MemoryState, now: Date): boolean {
  return Date.parse(state.authoritativeNextAt) <= now.getTime();
}

/** For display only: the shadow model's view, clearly separate from the real due date. */
export function shadowSummary(
  state: MemoryState,
  now: Date,
): { recommendedInDays: number; authoritativeInDays: number } {
  const n = toISO(now);
  return {
    recommendedInDays: Math.round(daysBetween(n, state.recommendedNextAt)),
    authoritativeInDays: Math.round(daysBetween(n, state.authoritativeNextAt)),
  };
}
