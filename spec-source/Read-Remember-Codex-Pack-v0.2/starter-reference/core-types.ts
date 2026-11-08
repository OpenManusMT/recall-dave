export type RecallLabel =
  | "correct"
  | "partial"
  | "incorrect"
  | "contradiction"
  | "vague"
  | "asr_uncertain";

export type RecallAction =
  | "accept"
  | "prompt_more"
  | "give_clue"
  | "correct_misconception_then_cue"
  | "prompt_specifics"
  | "confirm_transcript";

export type ClueLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface SourceEvidence {
  learnerSpan: string;
  sourceSpan: string;
}

export interface RecallScore {
  label: RecallLabel;
  score: number | null;
  clueLevel: ClueLevel | null;
  action: RecallAction;
  evidence: SourceEvidence[];
}

export interface MemoryState {
  difficulty: number;
  stability: number;
  retrievability: number;
  lastReviewAt: string | null;
  recommendedNextAt: string | null;
  authoritativeNextAt: string | null;
  mode: "shadow" | "live";
}
