/**
 * Progress measures. Descriptive reading-practice measures only: no clinical
 * meaning, no "brain score", no single combined improvement number.
 *
 * Practised material and fresh-text probes are always reported separately, so
 * improvement on rehearsed material is never presented as transfer.
 */
import type {
  ChunkAttempt,
  ClueLevel,
  IdeaOutcome,
  ISODate,
  ReviewLogEntry,
  Settings,
} from './types';
import { currentChunkTarget } from './settings';
import { startOfLocalDay } from './dates';

/** Independent-recall credit for one idea check: only unaided recall counts. */
export function independentCredit(outcome: IdeaOutcome, clueLevel: ClueLevel): number {
  if (clueLevel !== 0) return 0;
  if (outcome === 'correct') return 1;
  if (outcome === 'partial') return 0.5;
  return 0;
}

export const MIN_SAMPLES = 3;

export interface Metric {
  key: string;
  label: string;
  /** 0–1, or null when not measured / too few samples. */
  value: number | null;
  /** Number of observations. */
  n: number;
  /** Human-readable value: "72%", "Not measured yet", "Too few so far (2)". */
  display: string;
  explanation: string;
  /** For measures where lower is better (hint use). */
  lowerIsBetter?: boolean;
}

function metric(
  key: string,
  label: string,
  values: number[],
  explanation: string,
  lowerIsBetter = false,
): Metric {
  const n = values.length;
  if (n === 0)
    return { key, label, value: null, n, display: 'Not measured yet', explanation, lowerIsBetter };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < MIN_SAMPLES) {
    return {
      key,
      label,
      value: null,
      n,
      display: `Too few so far (${n})`,
      explanation,
      lowerIsBetter,
    };
  }
  return {
    key,
    label,
    value: mean,
    n,
    display: `${Math.round(mean * 100)}%`,
    explanation,
    lowerIsBetter,
  };
}

export interface WeekPoint {
  weekStart: ISODate;
  practisedDelayed: number | null;
  practisedN: number;
  fresh: number | null;
  freshN: number;
}

export interface Insights {
  practised: {
    immediate: Metric;
    nextDay: Metric;
    week: Metric;
    clueDependence: Metric;
    comprehension: Metric;
  };
  fresh: {
    immediate: Metric;
    comprehension: Metric;
    clueDependence: Metric;
  };
  comfortableChunkWords: number;
  chunkMode: Settings['chunkMode'];
  totals: { partsRead: number; pointsChecked: number; reviewsDone: number; freshChecks: number };
  weekly: WeekPoint[];
}

export const NEXT_DAY_WINDOW: [number, number] = [0.5, 3];
export const WEEK_WINDOW: [number, number] = [5, 10];

function mondayOf(d: Date): Date {
  const s = startOfLocalDay(d);
  const dow = (s.getDay() + 6) % 7; // Monday = 0
  s.setDate(s.getDate() - dow);
  return s;
}

export function computeInsights(
  data: { attempts: ChunkAttempt[]; reviewLog: ReviewLogEntry[]; settings: Settings },
  now: Date,
  weeks = 8,
): Insights {
  const { attempts, reviewLog, settings } = data;
  const practisedLearn = attempts.filter((a) => a.kind === 'learn' && a.firstExposure);
  const practisedAll = attempts.filter((a) => a.kind === 'learn' || a.kind === 'review');
  const probes = attempts.filter((a) => a.kind === 'probe' && a.firstExposure);

  const immediate = practisedLearn.flatMap((a) =>
    a.ideas.map((i) => independentCredit(i.outcome, i.clueLevel)),
  );
  const reviews = reviewLog.filter((r) => r.kind === 'review' && r.elapsedDays !== null);
  const inWindow = (r: ReviewLogEntry, [lo, hi]: [number, number]) =>
    (r.elapsedDays as number) >= lo && (r.elapsedDays as number) < hi;
  const nextDay = reviews
    .filter((r) => inWindow(r, NEXT_DAY_WINDOW))
    .map((r) => independentCredit(r.outcome, r.clueLevel));
  const week = reviews
    .filter(
      (r) =>
        (r.elapsedDays as number) >= WEEK_WINDOW[0] && (r.elapsedDays as number) <= WEEK_WINDOW[1],
    )
    .map((r) => independentCredit(r.outcome, r.clueLevel));
  const clue = practisedAll.flatMap((a) => a.ideas.map((i) => (i.clueLevel >= 1 ? 1 : 0)));
  const comp = practisedAll.filter((a) => a.question).map((a) => (a.question?.correct ? 1 : 0));

  const freshImmediate = probes.flatMap((a) =>
    a.ideas.map((i) => independentCredit(i.outcome, i.clueLevel)),
  );
  const freshComp = probes.filter((a) => a.question).map((a) => (a.question?.correct ? 1 : 0));
  const freshClue = probes.flatMap((a) => a.ideas.map((i) => (i.clueLevel >= 1 ? 1 : 0)));

  // Weekly trend: delayed recall on practised material vs first-read recall on fresh probes.
  const thisMonday = mondayOf(now);
  const weekly: WeekPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * w);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = (iso: ISODate) => {
      const t = Date.parse(iso);
      return t >= start.getTime() && t < end.getTime();
    };
    const p = reviews.filter(
      (r) => inWeek(r.at) && (r.elapsedDays as number) >= NEXT_DAY_WINDOW[0],
    );
    const f = probes.filter((a) => inWeek(a.completedAt)).flatMap((a) => a.ideas);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    weekly.push({
      weekStart: start.toISOString(),
      practisedDelayed: mean(p.map((r) => independentCredit(r.outcome, r.clueLevel))),
      practisedN: p.length,
      fresh: mean(f.map((i) => independentCredit(i.outcome, i.clueLevel))),
      freshN: f.length,
    });
  }

  return {
    practised: {
      immediate: metric(
        'immediate',
        'Straight after reading',
        immediate,
        'Points you wrote down on your own, without hints, just after reading a new part.',
      ),
      nextDay: metric(
        'nextDay',
        'Next-day recall',
        nextDay,
        'Points you remembered on your own when reviewing them roughly a day later.',
      ),
      week: metric(
        'week',
        'About a week later',
        week,
        'Points you remembered on your own when reviewing them 5 to 10 days later.',
      ),
      clueDependence: metric(
        'clueDependence',
        'Points that needed a hint',
        clue,
        'How often a hint, the sentence or a reread was used. Hints are there to help; lower simply means less help was needed.',
        true,
      ),
      comprehension: metric(
        'comprehension',
        'Understanding questions',
        comp,
        'Questions about the meaning of practised parts answered correctly first time.',
      ),
    },
    fresh: {
      immediate: metric(
        'freshImmediate',
        'Fresh text: straight after reading',
        freshImmediate,
        'Points remembered on your own from short passages you had never seen before. Kept separate from practised material.',
      ),
      comprehension: metric(
        'freshComprehension',
        'Fresh text: understanding',
        freshComp,
        'Understanding questions about never-seen-before passages.',
      ),
      clueDependence: metric(
        'freshClue',
        'Fresh text: points that needed a hint',
        freshClue,
        'How often hints were used on fresh passages.',
        true,
      ),
    },
    comfortableChunkWords: currentChunkTarget(settings),
    chunkMode: settings.chunkMode,
    totals: {
      partsRead: attempts.filter((a) => a.kind === 'learn' || a.kind === 'read').length,
      pointsChecked: practisedAll.reduce((n, a) => n + a.ideas.length, 0),
      reviewsDone: attempts.filter((a) => a.kind === 'review').length,
      freshChecks: probes.length,
    },
    weekly,
  };
}
