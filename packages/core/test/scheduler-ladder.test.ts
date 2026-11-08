import { describe, expect, it } from 'vitest';
import {
  FALLBACK_INTERVALS_DAYS,
  fsrsInit,
  fsrsInterval,
  fsrsNext,
  fsrsRetrievability,
  initialLadder,
  isDue,
  ladderFeedback,
  ladderReducer,
  mapGrade,
  nextFallbackStep,
  scheduleFirstExposure,
  scheduleReview,
  type LadderAction,
} from '../src';

const at = (s: string) => new Date(s);

describe('grade mapping (03-ADAPTIVE-ALGORITHM §6)', () => {
  it('maps failure or a source reveal to AGAIN', () => {
    expect(mapGrade('incorrect', 0, 1)).toBe('AGAIN');
    expect(mapGrade('correct', 4, 1)).toBe('AGAIN');
    expect(mapGrade('correct', 5, 1)).toBe('AGAIN');
  });
  it('maps substantial cues or partial recall to HARD', () => {
    expect(mapGrade('correct', 2, 1)).toBe('HARD');
    expect(mapGrade('correct', 3, 1)).toBe('HARD');
    expect(mapGrade('partial', 0, 1)).toBe('HARD');
  });
  it('maps little/no support to GOOD and strong delayed independent recall to EASY', () => {
    expect(mapGrade('correct', 0, null)).toBe('GOOD');
    expect(mapGrade('correct', 1, 5)).toBe('GOOD');
    expect(mapGrade('correct', 0, 2)).toBe('GOOD');
    expect(mapGrade('correct', 0, 3)).toBe('EASY');
  });
});

describe('FSRS-style shadow model', () => {
  it('retrievability equals desired retention at t = stability', () => {
    expect(fsrsRetrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(fsrsInterval(10)).toBeCloseTo(10, 5);
  });
  it('retrievability decays monotonically', () => {
    expect(fsrsRetrievability(1, 5)).toBeGreaterThan(fsrsRetrievability(5, 5));
    expect(fsrsRetrievability(0, 5)).toBe(1);
  });
  it('initial stability increases with grade and difficulty decreases', () => {
    const [a, h, g, e] = (['AGAIN', 'HARD', 'GOOD', 'EASY'] as const).map((x) => fsrsInit(x));
    expect(a!.stability).toBeLessThan(h!.stability);
    expect(h!.stability).toBeLessThan(g!.stability);
    expect(g!.stability).toBeLessThan(e!.stability);
    expect(a!.difficulty).toBeGreaterThan(e!.difficulty);
  });
  it('success grows stability, failure shrinks it, same-day leaves it unchanged', () => {
    const s = fsrsInit('GOOD');
    expect(fsrsNext(s, 'GOOD', 3).state.stability).toBeGreaterThan(s.stability);
    expect(fsrsNext(s, 'AGAIN', 3).state.stability).toBeLessThanOrEqual(s.stability);
    expect(fsrsNext(s, 'GOOD', 0.2).state.stability).toBe(s.stability);
  });
});

describe('authoritative fixed-step schedule', () => {
  it('first exposure is always checked again the next day, whatever the result', () => {
    for (const [o, c] of [
      ['correct', 0],
      ['incorrect', 5],
    ] as const) {
      const u = scheduleFirstExposure({
        ideaId: 'i',
        chunkId: 'c',
        documentId: 'd',
        isProbe: false,
        outcome: o,
        clueLevel: c,
        now: at('2026-11-08T15:00:00'),
      });
      expect(u.state.step).toBe(0);
      expect(new Date(u.state.authoritativeNextAt).getDate()).toBe(9);
      expect(new Date(u.state.authoritativeNextAt).getHours()).toBe(0);
    }
  });

  it('steps through 1, 3, 7, 14, 30, 60, 120 days and resets on AGAIN', () => {
    expect(FALLBACK_INTERVALS_DAYS).toEqual([1, 3, 7, 14, 30, 60, 120]);
    expect(nextFallbackStep(0, 'GOOD')).toBe(1);
    expect(nextFallbackStep(1, 'HARD')).toBe(1);
    expect(nextFallbackStep(1, 'EASY')).toBe(3);
    expect(nextFallbackStep(4, 'AGAIN')).toBe(0);
    expect(nextFallbackStep(6, 'EASY')).toBe(6);
  });

  it('keeps shadow recommendations separate from the real due date', () => {
    const first = scheduleFirstExposure({
      ideaId: 'i',
      chunkId: 'c',
      documentId: 'd',
      isProbe: false,
      outcome: 'correct',
      clueLevel: 0,
      now: at('2026-11-08T10:00:00'),
    });
    const rev = scheduleReview(first.state, 'correct', 0, at('2026-11-09T10:00:00'));
    expect(rev.state.mode).toBe('shadow');
    expect(rev.state.authoritativeNextAt).not.toBe('');
    expect(rev.state.recommendedNextAt).not.toBe('');
    // The authoritative date follows the fixed steps (3 days), regardless of the FSRS value.
    expect(new Date(rev.state.authoritativeNextAt).getDate()).toBe(12);
    expect(rev.state.reviewCount).toBe(1);
    expect(rev.elapsedDays).toBeCloseTo(1, 5);
  });

  it('does not advance the real schedule on a same-day re-practice', () => {
    const first = scheduleFirstExposure({
      ideaId: 'i',
      chunkId: 'c',
      documentId: 'd',
      isProbe: false,
      outcome: 'correct',
      clueLevel: 0,
      now: at('2026-11-08T10:00:00'),
    });
    const again = scheduleReview(first.state, 'correct', 0, at('2026-11-08T11:00:00'));
    expect(again.state.step).toBe(first.state.step);
  });

  it('is due from the start of the due day', () => {
    const first = scheduleFirstExposure({
      ideaId: 'i',
      chunkId: 'c',
      documentId: 'd',
      isProbe: false,
      outcome: 'correct',
      clueLevel: 0,
      now: at('2026-11-08T23:30:00'),
    });
    expect(isDue(first.state, at('2026-11-08T23:59:00'))).toBe(false);
    expect(isDue(first.state, at('2026-11-09T00:01:00'))).toBe(true);
  });
});

describe('self-check clue ladder', () => {
  const run = (...actions: LadderAction[]) => actions.reduce(ladderReducer, initialLadder());

  it('credits independent recall (level 0) when the point was already written and matches', () => {
    const s = run({ type: 'covered', answer: 'yes' }, { type: 'match', answer: 'yes' });
    expect(s).toMatchObject({ phase: 'done', outcome: 'correct', recordedLevel: 0 });
    expect(ladderFeedback(s)).toMatch(/on your own/);
  });

  it('records partial recall at level 0', () => {
    const s = run({ type: 'covered', answer: 'partly' }, { type: 'match', answer: 'partly' });
    expect(s).toMatchObject({ outcome: 'partial', recordedLevel: 0 });
  });

  it('a structural cue then recall is level 1', () => {
    const s = run({ type: 'remember_now' }, { type: 'match', answer: 'yes' });
    expect(s).toMatchObject({ outcome: 'correct', recordedLevel: 1 });
  });

  it('climbs semantic (2) then cloze (3) cues and records the highest needed', () => {
    const s = run(
      { type: 'covered', answer: 'no' },
      { type: 'another_hint' },
      { type: 'remember_now' },
      { type: 'match', answer: 'yes' },
    );
    expect(s).toMatchObject({ outcome: 'correct', recordedLevel: 3 });
  });

  it('after the cloze, a further hint shows the source sentence (4); reread is 5', () => {
    const s4 = run(
      { type: 'covered', answer: 'no' },
      { type: 'another_hint' },
      { type: 'another_hint' },
      { type: 'continue' },
    );
    expect(s4).toMatchObject({ outcome: 'incorrect', recordedLevel: 4 });
    const s5 = run({ type: 'covered', answer: 'no' }, { type: 'reread' }, { type: 'continue' });
    expect(s5).toMatchObject({ outcome: 'incorrect', recordedLevel: 5 });
  });

  it('a mismatch after a reveal goes to the source (no repeated guessing loop)', () => {
    const s = run(
      { type: 'covered', answer: 'no' },
      { type: 'remember_now' },
      { type: 'match', answer: 'no' },
    );
    expect(s).toMatchObject({ phase: 'done', outcome: 'incorrect', recordedLevel: 4 });
    expect(ladderFeedback(s)).not.toMatch(/wrong|fail|bad/i);
  });

  it('ignores actions that do not belong to the current phase (duplicate taps)', () => {
    const done = run({ type: 'covered', answer: 'yes' }, { type: 'match', answer: 'yes' });
    expect(ladderReducer(done, { type: 'match', answer: 'no' })).toBe(done);
    const ask = initialLadder();
    expect(ladderReducer(ask, { type: 'match', answer: 'yes' })).toBe(ask);
  });
});
