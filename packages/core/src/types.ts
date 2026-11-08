import type { Relation } from './content-types';

/** ISO-8601 timestamp in UTC, e.g. "2026-11-08T13:00:00.000Z". */
export type ISODate = string;

/** Clue ladder. Exactly these levels; the highest level needed is logged. */
export type ClueLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const CLUE_LEVELS: readonly { level: ClueLevel; name: string; description: string }[] = [
  { level: 0, name: 'Independent recall', description: 'Remembered without any help.' },
  {
    level: 1,
    name: 'Structural cue',
    description: 'Told how many points there were and what one is about.',
  },
  { level: 2, name: 'Semantic cue', description: 'Given a hint about the meaning.' },
  { level: 3, name: 'Strong cue', description: 'Shown the sentence with key words missing.' },
  {
    level: 4,
    name: 'Source sentence',
    description: 'Shown the supporting sentence from the text.',
  },
  { level: 5, name: 'Full reread', description: 'Read the whole part again.' },
];

/** Recall labels shared with the A001 contract. Self-check produces only the first three. */
export type RecallLabel =
  'correct' | 'partial' | 'incorrect' | 'contradiction' | 'vague' | 'asr_uncertain';

export type RecallAction =
  | 'accept'
  | 'prompt_more'
  | 'give_clue'
  | 'correct_misconception_then_cue'
  | 'prompt_specifics'
  | 'confirm_transcript';

/** FSRS-style review grade. */
export type Grade = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

/** Outcome recorded for one key idea after self-check (shown to the user only in kind words). */
export type IdeaOutcome = 'correct' | 'partial' | 'incorrect';

export type AttemptKind = 'learn' | 'review' | 'probe' | 'read';

export interface CueSet {
  /** Level 1: "Point 2 of 2 is about …" */
  structural: string;
  /** Level 2: a meaning-based nudge. */
  semantic: string;
  /** Level 3: the supporting sentence with key words blanked. */
  cloze: string;
  /** Level 4: the supporting source sentence(s), verbatim. */
  sentence: string;
}

export interface KeyIdeaSnapshot {
  id: string;
  /** Plain-language point (authored), or a verbatim sentence for pasted text. */
  text: string;
  sourceSpans: string[];
  qualifiers: string[];
  relation: Relation;
  topic: string;
  cues: CueSet;
  origin: 'authored' | 'heuristic';
}

export interface QuestionSnapshot {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanationSpan: string;
}

export interface ReadingDocument {
  id: string;
  title: string;
  text: string;
  createdAt: ISODate;
  provenance: 'sample' | 'pasted' | 'probe';
  /** Bundled passage id for samples/probes; null for pasted text. */
  passageId: string | null;
  status: 'new' | 'in_progress' | 'finished';
  /** Index of the next chunk to practise in "Help me remember" mode. */
  nextChunkIndex: number;
  /** Separate position for "Help me read" mode, so reading never skips parts to be practised. */
  readNextChunkIndex?: number;
  /** Total number of chunks currently planned. */
  chunkCount: number;
  updatedAt: ISODate;
}

export interface ChunkRecord {
  id: string;
  documentId: string;
  index: number;
  text: string;
  wordCount: number;
  /** Target words used when this chunk was planned (for audit). */
  plannedTargetWords: number;
  sectionIds: string[];
  ideas: KeyIdeaSnapshot[];
  questions: QuestionSnapshot[];
  createdAt: ISODate;
  /** Superseded chunks (after "Too much text" re-planning) are kept only if already read. */
  superseded: boolean;
}

export interface FsrsState {
  difficulty: number;
  stability: number;
  reps: number;
  lapses: number;
}

/** Memory state for one key idea. Both the authoritative and the shadow date are preserved. */
export interface MemoryState {
  /** Same as the idea id. */
  id: string;
  chunkId: string;
  documentId: string;
  isProbe: boolean;
  firstSeenAt: ISODate;
  lastReviewAt: ISODate;
  reviewCount: number;
  independentCount: number;
  highestClue: ClueLevel;
  clueHistory: ClueLevel[];
  /** Transparent fixed-step schedule — the one that is actually used. */
  step: number;
  authoritativeNextAt: ISODate;
  /** FSRS-style model — shadow mode only, never changes the real schedule in this release. */
  fsrs: FsrsState;
  retrievability: number | null;
  recommendedNextAt: ISODate;
  mode: 'shadow';
}

export interface IdeaCheck {
  ideaId: string;
  outcome: IdeaOutcome;
  clueLevel: ClueLevel;
}

export interface QuestionResult {
  questionId: string;
  chosenIndex: number;
  correct: boolean;
}

export interface ChunkAttempt {
  id: string;
  sessionId: string;
  documentId: string;
  chunkId: string;
  kind: AttemptKind;
  startedAt: ISODate;
  completedAt: ISODate;
  /** The learner's own words, exactly as confirmed. Never logged. */
  recallText: string;
  /** Typed text (including keyboard dictation, which the learner sees and can edit before checking). */
  inputMethod: 'typed';
  /** Number of times "Show text" was used during recall. */
  textPeeks: number;
  ideas: IdeaCheck[];
  question: QuestionResult | null;
  tooMuch: boolean;
  firstExposure: boolean;
  /** Days since this chunk was last practised (reviews only). */
  elapsedDays: number | null;
}

export interface ReviewLogEntry {
  /** `${attemptId}:${ideaId}` — makes scheduling idempotent. */
  id: string;
  attemptId: string;
  ideaId: string;
  at: ISODate;
  kind: AttemptKind;
  outcome: IdeaOutcome;
  clueLevel: ClueLevel;
  grade: Grade;
  elapsedDays: number | null;
  /** Dates proposed before this review (null on first exposure). */
  authoritativeDueBefore: ISODate | null;
  recommendedBefore: ISODate | null;
  /** Dates after this review. */
  authoritativeNextAt: ISODate;
  recommendedNextAt: ISODate;
  retrievabilityBefore: number | null;
}

export type StrategyName = 'read_aloud' | 'explain' | 'show_text' | 'too_much' | 'reread';

export interface StrategyUse {
  id: string;
  sessionId: string;
  at: ISODate;
  strategy: StrategyName;
  chunkId: string | null;
}

export interface AdaptationDecision {
  action: 'increase' | 'hold' | 'decrease' | 'not_enough_data' | 'fixed_by_user';
  fromWords: number;
  toWords: number;
  reason: string;
  window: {
    chunks: number;
    delayedRecall: number | null;
    comprehension: number | null;
    clueDependence: number | null;
  };
}

export interface SessionDraft {
  documentId: string;
  chunkId: string;
  phase: 'reading' | 'recall' | 'question' | 'check' | 'done';
  recallText: string;
  kind: AttemptKind;
}

export interface SessionRecord {
  id: string;
  startedAt: ISODate;
  updatedAt: ISODate;
  endedAt: ISODate | null;
  status: 'active' | 'finished';
  mode: 'remember' | 'read';
  adaptation: AdaptationDecision | null;
  attemptIds: string[];
  draft: SessionDraft | null;
}

export interface Settings {
  id: 'settings';
  /** Multiplier for reading text size (1 = 19px base). */
  fontScale: number;
  theme: 'system' | 'light' | 'dark';
  highContrast: boolean;
  reduceMotion: boolean;
  readingFont: 'sans' | 'serif';
  inputPreference: 'typing' | 'dictation';
  onboardingDone: boolean;
  /** "auto" follows the adaptive rule; "fixed" uses fixedChunkWords. */
  chunkMode: 'auto' | 'fixed';
  fixedChunkWords: number;
  adaptiveChunkWords: number;
  minChunkWords: number;
  maxChunkWords: number;
  askQuestions: boolean;
  /** The advanced scheduler stays in shadow mode in this release. */
  schedulerMode: 'shadow';
  /** Experimental local scorer hints (never affects schedule). Off by default. */
  experimentalScorer: boolean;
  lastAdaptationSessionId: string | null;
  /** When the part size last changed (rule or "Too much text"); only newer evidence is used next. */
  lastAdaptationAt: ISODate | null;
  /** When the learner last exported a backup (for a gentle reminder; browsers can clear site data). */
  lastBackupAt: ISODate | null;
}

export type CollectionName =
  | 'settings'
  | 'documents'
  | 'chunks'
  | 'memory'
  | 'attempts'
  | 'reviewLog'
  | 'sessions'
  | 'strategy';

export const COLLECTIONS: readonly CollectionName[] = [
  'settings',
  'documents',
  'chunks',
  'memory',
  'attempts',
  'reviewLog',
  'sessions',
  'strategy',
];

export interface RecordMap {
  settings: Settings;
  documents: ReadingDocument;
  chunks: ChunkRecord;
  memory: MemoryState;
  attempts: ChunkAttempt;
  reviewLog: ReviewLogEntry;
  sessions: SessionRecord;
  strategy: StrategyUse;
}

export type Snapshot = { [K in CollectionName]: RecordMap[K][] };
