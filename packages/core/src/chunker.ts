import type { AuthoredIdea, AuthoredPassage, AuthoredSection, Relation } from './content-types';
import type { KeyIdeaSnapshot, QuestionSnapshot } from './types';
import { buildAuthoredCues, makeCloze, renumberStructural, sentenceCue, structuralCue } from './clues';
import { findCriticalQualifiers } from './content-validate';
import { containsSpan, countWords, normaliseSpace, splitParagraphs, splitSentences, wordTokens } from './text';
import { isStopword } from './stopwords';

export interface ChunkOptions {
  /** Comfortable target (default 80). */
  targetWords: number;
  /** Configurable minimum (default 40). */
  minWords: number;
  /** Starting maximum (default 180). */
  maxWords: number;
  /** Hard cap on ideas per chunk (spec: 3). */
  maxIdeas?: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { targetWords: 80, minWords: 40, maxWords: 180, maxIdeas: 3 };

export interface PlannedChunk {
  text: string;
  wordCount: number;
  sectionIds: string[];
  ideas: KeyIdeaSnapshot[];
  questions: QuestionSnapshot[];
}

interface Unit {
  sentences: string[];
  sectionIds: string[];
  ideas: KeyIdeaSnapshot[];
  questions: QuestionSnapshot[];
}

const unitText = (u: Unit) => u.sentences.join(' ');
const unitWords = (u: Unit) => countWords(unitText(u));

export function clampOptions(o: ChunkOptions): Required<ChunkOptions> {
  const minWords = Math.max(20, Math.round(o.minWords));
  const maxWords = Math.max(minWords + 10, Math.round(o.maxWords));
  const targetWords = Math.min(maxWords, Math.max(minWords, Math.round(o.targetWords)));
  return { targetWords, minWords, maxWords, maxIdeas: Math.min(3, Math.max(1, o.maxIdeas ?? 3)) };
}

/** Sentence index range [first, last] that covers every span of an idea, or null if not locatable. */
function spanRange(sentences: string[], spans: string[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const span of spans) {
    const s = normaliseSpace(span);
    let found = false;
    // A span may cross sentence boundaries: try every window of consecutive sentences.
    for (let i = 0; i < sentences.length && !found; i++) {
      let joined = '';
      for (let j = i; j < sentences.length; j++) {
        joined = joined ? `${joined} ${sentences[j]}` : (sentences[j] ?? '');
        if (normaliseSpace(joined).includes(s)) {
          // shrink from the left to the tightest window
          let start = i;
          while (start < j && normaliseSpace(sentences.slice(start + 1, j + 1).join(' ')).includes(s)) start++;
          lo = Math.min(lo, start);
          hi = Math.max(hi, j);
          found = true;
          break;
        }
      }
    }
    if (!found) return null;
  }
  return Number.isFinite(lo) ? [lo, hi] : null;
}

function authoredIdeaSnapshot(passageId: string, idea: AuthoredIdea): KeyIdeaSnapshot {
  return {
    id: `${passageId}:${idea.id}`,
    text: idea.text,
    sourceSpans: [...idea.sourceSpans],
    qualifiers: [...idea.qualifiers],
    relation: idea.relation,
    topic: idea.topic,
    cues: buildAuthoredCues(idea, 0, 1),
    origin: 'authored',
  };
}

function sectionUnit(passageId: string, s: AuthoredSection): Unit {
  return {
    sentences: splitSentences(s.text),
    sectionIds: [s.id],
    ideas: s.ideas.map((i) => authoredIdeaSnapshot(passageId, i)),
    questions: [{ ...s.question, id: `${passageId}:${s.question.id}`, options: [...s.question.options] }],
  };
}

/**
 * Split one unit into two at the sentence boundary closest to the middle,
 * provided every idea stays whole, both halves keep at least one idea and both
 * reach the minimum length. Otherwise the unit is returned unchanged:
 * meaningful boundaries outrank word counts.
 */
function trySplit(u: Unit, o: Required<ChunkOptions>): Unit[] {
  const n = u.sentences.length;
  if (n < 2) return [u];
  const ranges = u.ideas.map((i) => spanRange(u.sentences, i.sourceSpans));
  if (ranges.some((r) => r === null)) return [u];
  let best: { cut: number; cost: number } | null = null;
  for (let cut = 1; cut < n; cut++) {
    if (ranges.some((r) => r && r[0] < cut && r[1] >= cut)) continue; // would split an idea
    const left = u.sentences.slice(0, cut);
    const right = u.sentences.slice(cut);
    const lw = countWords(left.join(' '));
    const rw = countWords(right.join(' '));
    if (lw < o.minWords || rw < o.minWords) continue;
    const leftIdeas = ranges.filter((r) => r && r[1] < cut).length;
    const rightIdeas = ranges.length - leftIdeas;
    if (leftIdeas === 0 || rightIdeas === 0) continue;
    const cost = Math.abs(lw - o.targetWords) + Math.abs(rw - o.targetWords);
    if (!best || cost < best.cost) best = { cut, cost };
  }
  if (!best) return [u];
  const cut = best.cut;
  const inLeft = (idx: number) => (ranges[idx] as [number, number])[1] < cut;
  const leftText = u.sentences.slice(0, cut).join(' ');
  const rightText = u.sentences.slice(cut).join(' ');
  const qIn = (text: string) => u.questions.filter((q) => containsSpan(text, q.explanationSpan));
  return [
    {
      sentences: u.sentences.slice(0, cut),
      sectionIds: u.sectionIds,
      ideas: u.ideas.filter((_, i) => inLeft(i)),
      questions: qIn(leftText),
    },
    {
      sentences: u.sentences.slice(cut),
      sectionIds: u.sectionIds,
      ideas: u.ideas.filter((_, i) => !inLeft(i)),
      questions: qIn(rightText),
    },
  ];
}

function mergeUnits(units: Unit[], o: Required<ChunkOptions>): Unit[] {
  const out: Unit[] = [];
  for (const u of units) {
    const prev = out[out.length - 1];
    if (prev) {
      const pw = unitWords(prev);
      const uw = unitWords(u);
      const combined = pw + uw;
      const ideas = prev.ideas.length + u.ideas.length;
      const fitsTarget = combined <= o.targetWords * 1.15;
      const prevTooShort = pw < o.minWords;
      if (ideas <= o.maxIdeas && combined <= o.maxWords && (fitsTarget || prevTooShort)) {
        out[out.length - 1] = {
          sentences: [...prev.sentences, ...u.sentences],
          sectionIds: [...new Set([...prev.sectionIds, ...u.sectionIds])],
          ideas: [...prev.ideas, ...u.ideas],
          questions: [...prev.questions, ...u.questions],
        };
        continue;
      }
    }
    out.push(u);
  }
  // A short final unit joins its predecessor when that keeps within the limits.
  if (out.length >= 2) {
    const last = out[out.length - 1] as Unit;
    const prev = out[out.length - 2] as Unit;
    if (
      unitWords(last) < o.minWords &&
      unitWords(prev) + unitWords(last) <= o.maxWords &&
      prev.ideas.length + last.ideas.length <= o.maxIdeas
    ) {
      out.splice(out.length - 2, 2, {
        sentences: [...prev.sentences, ...last.sentences],
        sectionIds: [...new Set([...prev.sectionIds, ...last.sectionIds])],
        ideas: [...prev.ideas, ...last.ideas],
        questions: [...prev.questions, ...last.questions],
      });
    }
  }
  return out;
}

function finalise(units: Unit[]): PlannedChunk[] {
  return units.map((u) => {
    const text = unitText(u);
    return {
      text,
      wordCount: countWords(text),
      sectionIds: u.sectionIds,
      ideas: renumberStructural(u.ideas),
      questions: u.questions,
    };
  });
}

/** Plan chunks for a bundled passage, starting from section `fromSection`. */
export function planAuthoredChunks(
  passage: AuthoredPassage,
  options: ChunkOptions,
  fromSection = 0,
): PlannedChunk[] {
  const o = clampOptions(options);
  const units: Unit[] = [];
  for (const s of passage.sections.slice(fromSection)) {
    const u = sectionUnit(passage.id, s);
    if (unitWords(u) > o.targetWords * 1.35) units.push(...trySplit(u, o));
    else units.push(u);
  }
  return finalise(mergeUnits(units, o));
}

// ---------------------------------------------------------------------------
// Pasted text: no authored ideas. Key sentences are picked by a transparent
// keyword heuristic (not AI) and kept verbatim, so they are grounded by design.
// ---------------------------------------------------------------------------

function guessRelation(sentence: string): Relation {
  const s = sentence.toLowerCase();
  if (/\b(unless|except|apart from|however|but not)\b/.test(s)) return 'rule_exception';
  if (/\b(because|so that|therefore|causes?|leads? to|as a result|which means|due to)\b/.test(s)) return 'cause_effect';
  if (/\b(first|then|after|before|next|finally|later|until)\b/.test(s)) return 'sequence';
  if (/\b(than|whereas|unlike|similar|compared)\b/.test(s)) return 'comparison';
  return 'fact';
}

function contentWords(sentence: string): string[] {
  return wordTokens(sentence).filter((t) => t.length >= 4 && !isStopword(t) && !/^\d+$/.test(t));
}

export function sentenceInformation(sentence: string, isFirst: boolean): number {
  const words = contentWords(sentence);
  const numbers = (sentence.match(/\d+/g) ?? []).length;
  const names = (sentence.slice(1).match(/\b[A-Z][a-z]{2,}/g) ?? []).length;
  const causal = /\b(because|so|therefore|unless|except|which means)\b/i.test(sentence) ? 1 : 0;
  const lengthPenalty = countWords(sentence) > 45 ? 2 : 0;
  return new Set(words).size + 1.5 * numbers + names + causal + (isFirst ? 1.5 : 0) - lengthPenalty;
}

function positionPhrase(i: number, n: number): string {
  if (n <= 1) return 'this part of the text';
  const rel = i / Math.max(1, n - 1);
  if (rel < 0.34) return 'the beginning of this part';
  if (rel > 0.66) return 'the end of this part';
  return 'the middle of this part';
}

/** Pick the 1–3 most informative sentences of a chunk as grounded key points. */
export function heuristicIdeas(chunkText: string, idPrefix: string, maxIdeas = 3): KeyIdeaSnapshot[] {
  const sentences = splitSentences(chunkText);
  if (sentences.length === 0) return [];
  const words = countWords(chunkText);
  let n = words < 60 || sentences.length <= 2 ? 1 : 2;
  if (words > 130 && sentences.length >= 5) n = 3;
  n = Math.min(n, maxIdeas, sentences.length);
  const ranked = sentences
    .map((s, i) => ({ s, i, score: sentenceInformation(s, i === 0) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, n)
    .sort((a, b) => a.i - b.i);
  return ranked.map((r, k) => {
    const cw = contentWords(r.s);
    const freq = new Map<string, number>();
    for (const w of cw) freq.set(w, (freq.get(w) ?? 0) + 1);
    const keywords = [...new Set(cw)].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || b.length - a.length);
    const hint = keywords[0];
    const clozeWords = keywords.slice(0, 2);
    // Find the original-case versions of the keywords in the sentence for the cloze.
    const originals = clozeWords
      .map((w) => r.s.match(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'))?.[0])
      .filter((x): x is string => Boolean(x));
    const topic = positionPhrase(r.i, sentences.length);
    return {
      id: `${idPrefix}:k${k + 1}`,
      text: r.s,
      sourceSpans: [r.s],
      qualifiers: findCriticalQualifiers(r.s),
      relation: guessRelation(r.s),
      topic,
      cues: {
        structural: structuralCue(k, ranked.length, topic),
        semantic: hint ? `It mentions the word “${hint}”.` : 'Think about what this part was mainly saying.',
        cloze: makeCloze(r.s, originals),
        sentence: sentenceCue([r.s]),
      },
      origin: 'heuristic' as const,
    };
  });
}

/** Plan chunks for pasted text: paragraph boundaries first, then sentence groups. */
export function planPastedChunks(text: string, options: ChunkOptions, idPrefix: string): PlannedChunk[] {
  const o = clampOptions(options);
  const units: Unit[] = [];
  for (const para of splitParagraphs(text)) {
    const sentences = splitSentences(para);
    const words = countWords(para);
    if (words <= o.targetWords * 1.35) {
      units.push({ sentences, sectionIds: [], ideas: [], questions: [] });
      continue;
    }
    // Greedy sentence grouping near the target size.
    let current: string[] = [];
    for (const s of sentences) {
      const cw = countWords(current.join(' '));
      const sw = countWords(s);
      if (current.length > 0 && cw >= o.minWords && (cw + sw > o.targetWords * 1.15 || cw >= o.targetWords * 0.85)) {
        units.push({ sentences: current, sectionIds: [], ideas: [], questions: [] });
        current = [];
      }
      current.push(s);
    }
    if (current.length) units.push({ sentences: current, sectionIds: [], ideas: [], questions: [] });
  }
  // Pasted units carry no ideas yet, so merging is limited by words only.
  const merged = mergeUnits(units, { ...o, maxIdeas: Number.POSITIVE_INFINITY as unknown as number });
  return merged.map((u, idx) => {
    const t = unitText(u);
    const ideas = heuristicIdeas(t, `${idPrefix}:c${idx}`, o.maxIdeas);
    return { text: t, wordCount: countWords(t), sectionIds: [], ideas, questions: [] };
  });
}
