/**
 * Types for bundled, human-authored reading material.
 *
 * A passage is a sequence of *sections*. A section is the smallest coherent
 * semantic unit (normally 1–2 main ideas). The chunker groups or splits
 * sections into chunks according to the learner's comfortable chunk size, but
 * it never breaks the link between an idea and the exact source text that
 * supports it.
 */

export type Relation = 'cause_effect' | 'sequence' | 'comparison' | 'rule_exception' | 'fact';

export const RELATIONS: readonly Relation[] = [
  'cause_effect',
  'sequence',
  'comparison',
  'rule_exception',
  'fact',
];

export interface AuthoredIdea {
  /** Unique within the passage, e.g. "s1-i1". */
  id: string;
  /** Plain-language proposition in UK English (max 160 characters). */
  text: string;
  /** One or more exact, verbatim substrings of the section text that support the idea. */
  sourceSpans: string[];
  /** Verbatim qualifier words/phrases that must be preserved (e.g. "usually", "unless"). May be empty. */
  qualifiers: string[];
  relation: Relation;
  /** Short topic label used for the structural cue: "Point 2 is about …". Must not give the answer away. */
  topic: string;
  /** A hint that nudges memory without stating the answer (max 140 characters). */
  semanticCue: string;
  /** 1–3 verbatim words/short phrases from sourceSpans[0] to blank out for the cloze cue. */
  clozeAnswers: string[];
}

export interface AuthoredQuestion {
  id: string;
  prompt: string;
  /** Exactly three options. */
  options: string[];
  answerIndex: number;
  /** Verbatim span of the section text that supports the correct answer. */
  explanationSpan: string;
}

export interface AuthoredSection {
  /** Unique within the passage, e.g. "s1". */
  id: string;
  /** One coherent semantic unit, 35–110 words. */
  text: string;
  /** One or two ideas. */
  ideas: AuthoredIdea[];
  question: AuthoredQuestion;
}

export type PassageSubject =
  'food' | 'nature' | 'travel' | 'history' | 'home' | 'practical' | 'science' | 'places';

export interface AuthoredPassage {
  /** Stable id, e.g. "p01-bread". Probes start with "probe-". */
  id: string;
  title: string;
  subject: PassageSubject;
  /** One line shown in the library. */
  summary: string;
  density: 'light' | 'medium' | 'dense';
  /** "library" passages are for practice; "probe" passages are fresh-text checks only. */
  kind: 'library' | 'probe';
  sections: AuthoredSection[];
  /** Editorial note on facts and confidence; never shown in the app. */
  factNotes: string;
}
