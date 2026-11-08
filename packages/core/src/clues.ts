import type { AuthoredIdea, Relation } from './content-types';
import type { ClueLevel, CueSet, KeyIdeaSnapshot } from './types';
import { normaliseSpace } from './text';

const RELATION_PHRASE: Record<Relation, string> = {
  cause_effect: 'explains a cause and its effect',
  sequence: 'describes steps or things happening in order',
  comparison: 'compares two things',
  rule_exception: 'gives a rule and an exception',
  fact: 'states a fact',
};

export function relationPhrase(r: Relation): string {
  return RELATION_PHRASE[r];
}

/** Level 1 cue: position, count and topic, without giving the answer. */
export function structuralCue(index: number, total: number, topic: string): string {
  const t = topic.trim().replace(/[.]+$/, '');
  if (total <= 1) return `This part has one main point. It is about ${t}.`;
  return `This part has ${total} main points. Point ${index + 1} is about ${t}.`;
}

function blankWord(word: string): string {
  const first = word.match(/[\p{L}\p{N}]/u)?.[0] ?? '';
  return `${first}_____`;
}

/**
 * Level 3 cue: the supporting sentence with key words blanked. Each blank keeps
 * the first letter so the cue is strong but still asks for retrieval.
 */
export function makeCloze(span: string, answers: string[]): string {
  let out = normaliseSpace(span);
  for (const ans of answers) {
    const a = normaliseSpace(ans);
    if (!a) continue;
    const idx = out.toLowerCase().indexOf(a.toLowerCase());
    if (idx < 0) continue;
    const original = out.slice(idx, idx + a.length);
    const blanked = original.split(/\s+/).map(blankWord).join(' ');
    out = out.slice(0, idx) + blanked + out.slice(idx + a.length);
  }
  return out;
}

/** Level 4 cue: the verbatim supporting text. */
export function sentenceCue(spans: string[]): string {
  return spans.map((s) => normaliseSpace(s)).join(' … ');
}

export function buildAuthoredCues(idea: AuthoredIdea, index: number, total: number): CueSet {
  return {
    structural: structuralCue(index, total, idea.topic),
    semantic: idea.semanticCue,
    cloze: makeCloze(idea.sourceSpans[0] ?? '', idea.clozeAnswers),
    sentence: sentenceCue(idea.sourceSpans),
  };
}

/** Text to show for a given clue level (level 5 is the whole chunk, supplied by the caller). */
export function cueText(idea: KeyIdeaSnapshot, level: ClueLevel, chunkText: string): string {
  switch (level) {
    case 0:
      return '';
    case 1:
      return idea.cues.structural;
    case 2:
      return idea.cues.semantic;
    case 3:
      return idea.cues.cloze;
    case 4:
      return idea.cues.sentence;
    case 5:
      return chunkText;
  }
}

/** Re-number structural cues after ideas are grouped into a chunk. */
export function renumberStructural(ideas: KeyIdeaSnapshot[]): KeyIdeaSnapshot[] {
  return ideas.map((idea, i) => ({
    ...idea,
    cues: { ...idea.cues, structural: structuralCue(i, ideas.length, idea.topic) },
  }));
}
