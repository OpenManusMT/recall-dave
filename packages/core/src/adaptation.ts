/**
 * Chunk-size adaptation (03-ADAPTIVE-ALGORITHM.md §1).
 *
 * Engineering defaults, NOT medically validated thresholds:
 *   delayed recall ≥ 85% AND comprehension ≥ 85% AND clue dependence ≤ 20% → +10%
 *   delayed recall 55–84% → hold
 *   delayed recall < 55% → −15%
 *   explicit "Too much text" → −15% immediately
 * Uses a rolling window of recent NEW chunks (never one isolated attempt),
 * changes at most one variable (chunk size) once per session, and always
 * respects the learner's own fixed choice.
 */
import type { AdaptationDecision, ChunkAttempt, ReviewLogEntry, Settings } from './types';
import { currentChunkTarget } from './settings';
import { independentCredit, NEXT_DAY_WINDOW } from './progress';

export interface AdaptationConfig {
  windowChunks: number;
  minChunksWithDelayedData: number;
  increaseIf: { delayedRecall: number; comprehension: number; clueDependence: number };
  decreaseBelow: number;
  increaseFactor: number;
  decreaseFactor: number;
  tooMuchFactor: number;
}

export const DEFAULT_ADAPTATION: AdaptationConfig = {
  windowChunks: 6,
  minChunksWithDelayedData: 3,
  increaseIf: { delayedRecall: 0.85, comprehension: 0.85, clueDependence: 0.2 },
  decreaseBelow: 0.55,
  increaseFactor: 1.1,
  decreaseFactor: 0.85,
  tooMuchFactor: 0.85,
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function decideAdaptation(
  data: { attempts: ChunkAttempt[]; reviewLog: ReviewLogEntry[]; settings: Settings },
  cfg: AdaptationConfig = DEFAULT_ADAPTATION,
): AdaptationDecision {
  const { settings } = data;
  const from = currentChunkTarget(settings);
  // Only parts first read since the last size change count: the same evidence must never
  // shrink (or grow) the size again in every new session.
  const since = settings.lastAdaptationAt ? Date.parse(settings.lastAdaptationAt) : -Infinity;
  const recentNew = data.attempts
    .filter((a) => a.kind === 'learn' && a.firstExposure && Date.parse(a.completedAt) > since)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, cfg.windowChunks);

  // First delayed review of each idea from those chunks.
  const firstDelayed = new Map<string, ReviewLogEntry>();
  for (const r of [...data.reviewLog].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (r.kind !== 'review' || r.elapsedDays === null || r.elapsedDays < NEXT_DAY_WINDOW[0])
      continue;
    if (!firstDelayed.has(r.ideaId)) firstDelayed.set(r.ideaId, r);
  }
  const chunksWithDelayed = recentNew.filter((a) =>
    a.ideas.some((i) => firstDelayed.has(i.ideaId)),
  );
  const delayed = mean(
    chunksWithDelayed.flatMap((a) =>
      a.ideas
        .map((i) => firstDelayed.get(i.ideaId))
        .filter((r): r is ReviewLogEntry => Boolean(r))
        .map((r) => independentCredit(r.outcome, r.clueLevel)),
    ),
  );
  const comprehension = mean(
    recentNew.filter((a) => a.question).map((a) => (a.question?.correct ? 1 : 0)),
  );
  const clueDependence = mean(
    recentNew.flatMap((a) => a.ideas.map((i) => (i.clueLevel >= 1 ? 1 : 0))),
  );
  const window = {
    chunks: recentNew.length,
    delayedRecall: delayed,
    comprehension,
    clueDependence,
  };

  const clampW = (w: number) =>
    Math.min(settings.maxChunkWords, Math.max(settings.minChunkWords, Math.round(w)));

  if (settings.chunkMode === 'fixed') {
    return {
      action: 'fixed_by_user',
      fromWords: from,
      toWords: from,
      reason: 'You chose a fixed chunk size.',
      window,
    };
  }
  if (chunksWithDelayed.length < cfg.minChunksWithDelayedData || delayed === null) {
    return {
      action: 'not_enough_data',
      fromWords: from,
      toWords: from,
      reason:
        'Keeping the same size until a few more parts have been reviewed a day or more later.',
      window,
    };
  }
  if (
    delayed >= cfg.increaseIf.delayedRecall &&
    comprehension !== null &&
    comprehension >= cfg.increaseIf.comprehension &&
    clueDependence !== null &&
    clueDependence <= cfg.increaseIf.clueDependence
  ) {
    const to = clampW(from * cfg.increaseFactor);
    return {
      action: to > from ? 'increase' : 'hold',
      fromWords: from,
      toWords: to,
      reason:
        to > from
          ? 'Recent parts were remembered well the next day with few hints, so parts will be a little longer.'
          : 'Already at the longest size.',
      window,
    };
  }
  if (delayed < cfg.decreaseBelow) {
    const to = clampW(from * cfg.decreaseFactor);
    return {
      action: to < from ? 'decrease' : 'hold',
      fromWords: from,
      toWords: to,
      reason:
        to < from
          ? 'Parts will be a little shorter to make them easier to hold on to.'
          : 'Already at the shortest size.',
      window,
    };
  }
  return {
    action: 'hold',
    fromWords: from,
    toWords: from,
    reason: 'The current size seems about right.',
    window,
  };
}

/**
 * Apply a decision to settings at the start of a session (at most once per
 * session — one major variable per session).
 */
export function applyAdaptation(
  settings: Settings,
  decision: AdaptationDecision,
  sessionId: string,
  now: Date = new Date(),
): Settings {
  if (settings.lastAdaptationSessionId === sessionId) return settings;
  if (decision.action !== 'increase' && decision.action !== 'decrease') {
    return { ...settings, lastAdaptationSessionId: sessionId };
  }
  return {
    ...settings,
    adaptiveChunkWords: decision.toWords,
    lastAdaptationSessionId: sessionId,
    lastAdaptationAt: now.toISOString(),
  };
}

/** "Too much text": reduce immediately, from whichever is smaller — the target or the chunk just shown. */
export function tooMuchTarget(
  settings: Settings,
  shownChunkWords: number,
  cfg = DEFAULT_ADAPTATION,
): number {
  const base = Math.min(
    currentChunkTarget(settings),
    Math.max(settings.minChunkWords, shownChunkWords),
  );
  return Math.max(settings.minChunkWords, Math.round(base * cfg.tooMuchFactor));
}
