/**
 * Self-check with a clue ladder, for one key idea.
 *
 * This is the no-AI path: the learner compares their own words with the
 * source-backed point. Help is given in the smallest step first:
 *
 *   level 0  the point was already in their free recall (checked after reveal)
 *   level 1  structural cue — "This part has 2 main points. Point 2 is about …"
 *   level 2  semantic cue
 *   level 3  cloze / strong cue
 *   level 4  the supporting source sentence
 *   level 5  read the whole part again
 *
 * The highest level needed is recorded. A mismatch after a reveal never loops
 * back into repeated guessing: it moves straight to the source sentence.
 */
import type { ClueLevel, IdeaOutcome } from './types';

export type LadderPhase =
  /** Structural cue shown. "Is this point in what you wrote?" */
  | 'ask'
  /** A cue (level 2–3) is shown. "I remember it now" / "Another hint". */
  | 'cue'
  /** The point is revealed. "Does it match what you remembered?" */
  | 'verify'
  /** The source sentence (4) or full chunk (5) is shown for re-study. */
  | 'study'
  | 'done';

export interface LadderState {
  phase: LadderPhase;
  /** Highest cue level shown so far. */
  cueLevel: ClueLevel;
  /** Level that will be credited if the learner confirms a match at `verify`. */
  creditLevel: ClueLevel;
  /** What the learner said at `ask`: helps phrase the verify question. */
  claimed: 'yes' | 'partly' | null;
  outcome: IdeaOutcome | null;
  /** Final clue level recorded for this idea. */
  recordedLevel: ClueLevel | null;
}

export type LadderAction =
  | { type: 'covered'; answer: 'yes' | 'partly' | 'no' }
  | { type: 'remember_now' }
  | { type: 'another_hint' }
  | { type: 'show_sentence' }
  | { type: 'reread' }
  | { type: 'match'; answer: 'yes' | 'partly' | 'no' }
  | { type: 'continue' };

export const initialLadder = (): LadderState => ({
  phase: 'ask',
  cueLevel: 1,
  creditLevel: 0,
  claimed: null,
  outcome: null,
  recordedLevel: null,
});

const bump = (l: ClueLevel): ClueLevel => Math.min(5, l + 1) as ClueLevel;

export function ladderReducer(s: LadderState, a: LadderAction): LadderState {
  if (s.phase === 'done') return s;
  switch (a.type) {
    case 'covered':
      if (s.phase !== 'ask') return s;
      if (a.answer === 'no') return { ...s, phase: 'cue', cueLevel: 2, claimed: null };
      // It was in their free recall: credit independent recall if the reveal matches.
      return { ...s, phase: 'verify', creditLevel: 0, claimed: a.answer };
    case 'remember_now':
      if (s.phase !== 'cue' && s.phase !== 'ask') return s;
      return { ...s, phase: 'verify', creditLevel: s.cueLevel, claimed: 'yes' };
    case 'another_hint': {
      if (s.phase !== 'cue' && s.phase !== 'ask') return s;
      const next = bump(s.cueLevel);
      if (next >= 4) return { ...s, phase: 'study', cueLevel: 4 };
      return { ...s, phase: 'cue', cueLevel: next };
    }
    case 'show_sentence':
      if (s.phase === 'study') return s;
      return { ...s, phase: 'study', cueLevel: Math.max(4, s.cueLevel) as ClueLevel };
    case 'reread':
      return { ...s, phase: 'study', cueLevel: 5 };
    case 'match': {
      if (s.phase !== 'verify') return s;
      if (a.answer === 'yes') {
        return { ...s, phase: 'done', outcome: 'correct', recordedLevel: s.creditLevel };
      }
      if (a.answer === 'partly') {
        return { ...s, phase: 'done', outcome: 'partial', recordedLevel: s.creditLevel };
      }
      // Their version differed: the point has now been shown, which is a source reveal.
      return {
        ...s,
        phase: 'done',
        outcome: 'incorrect',
        recordedLevel: Math.max(4, s.cueLevel) as ClueLevel,
      };
    }
    case 'continue':
      if (s.phase !== 'study') return s;
      return { ...s, phase: 'done', outcome: 'incorrect', recordedLevel: s.cueLevel };
  }
}

/** Kind, non-judgemental feedback for the learner after an idea is checked. */
export function ladderFeedback(s: LadderState): string {
  if (s.phase !== 'done' || s.outcome === null || s.recordedLevel === null) return '';
  if (s.outcome === 'correct' && s.recordedLevel === 0)
    return 'You remembered this point on your own.';
  if (s.outcome === 'correct') return 'You remembered this point with a hint.';
  if (s.outcome === 'partial') return 'You had part of this point. It will come up again soon.';
  return 'Now you have seen this point. It will come up again in a review, which helps it stick.';
}
