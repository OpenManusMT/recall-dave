/**
 * EXPERIMENTAL deterministic local recall scorer ("candidate scorer").
 *
 * Status: DISABLED in the product. It has NOT passed the A001 acceptance gate
 * (see docs/RELEASE-REPORT.md and tests/a001/results). It never affects any
 * schedule and is not shown to the learner by default.
 *
 * It judges only the source text, the key ideas and the transcript — it never
 * sees case ids, tags, titles or expected answers. Pure, deterministic, no
 * network, no model.
 *
 * Method (transparent and auditable):
 *  1. Normalise (lower case, contractions, fillers, number words, light stemming,
 *     a small general-purpose synonym map).
 *  2. ASR safety: if the transcript contains words that sound like a source
 *     word but are not in the source (e.g. "soul" for "soil", "die oxide" for
 *     "dioxide"), return asr_uncertain with a null score: confirm first.
 *  3. Coverage of each key idea's content words.
 *  4. Contradiction signals (negation flips, antonyms, changed numbers) override
 *     overlap: shared words can never rescue a contradiction.
 *  5. Map to label / score / clue / action using the A001 contract.
 */
import type { ClueLevel, RecallAction, RecallLabel } from './types';
import { isStopword } from './stopwords';

export interface ScorerInput {
  sourceText: string;
  keyIdeas: { id: string; text: string }[];
  transcript: string;
}

export interface IdeaScore {
  ideaId: string;
  coverage: number;
  contradiction: boolean;
}

export interface ScorerOutput {
  label: RecallLabel;
  score: number | null;
  clueLevel: ClueLevel | null;
  action: RecallAction;
  ideaScores: IdeaScore[];
  evidence: string[];
  /** Always true: this scorer is experimental and never authoritative. */
  experimental: true;
}

export const SCORER_LIMITS = { sourceChars: 4000, transcriptChars: 2000, ideas: 3 };

const FILLERS = /\b(um+|uh+|er+|erm+|ah+|hmm+|you know|i mean|sort of|kind of|innit|like,)\b/g;

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan['’]t\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon['’]t\b/g, 'will not'],
  [/\bshan['’]t\b/g, 'shall not'],
  [/\b(\w+)n['’]t\b/g, '$1 not'],
  [/\b(\w+)['’](re|ve|ll|d|s|m)\b/g, '$1'],
];

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
};

/** General-purpose synonym groups (not tuned to any test case). First item is canonical. */
const SYNONYMS: string[][] = [
  ['big', 'large', 'huge', 'great', 'bigger', 'larger'],
  ['small', 'little', 'tiny', 'smaller'],
  ['start', 'begin', 'began', 'begun', 'starting', 'beginning'],
  ['stop', 'end', 'finish', 'halt'],
  ['fast', 'quick', 'quickly', 'rapid', 'rapidly', 'speedy'],
  ['slow', 'slowly', 'gradual', 'gradually'],
  ['help', 'aid', 'assist', 'support'],
  ['show', 'tell', 'indicate', 'communicate', 'signal', 'reveal', 'explain', 'say', 'says'],
  ['make', 'create', 'produce', 'form', 'build', 'made', 'produced', 'formed'],
  ['get', 'obtain', 'receive', 'gain', 'acquire'],
  ['use', 'using', 'used', 'utilise', 'utilize', 'employ'],
  ['need', 'require', 'must', 'needs', 'required'],
  ['keep', 'stay', 'remain', 'retain'],
  ['move', 'travel', 'go', 'head'],
  ['food', 'meal', 'nectar', 'feed'],
  ['house', 'home', 'dwelling'],
  ['car', 'vehicle', 'motor'],
  ['buy', 'purchase'],
  ['allow', 'let', 'permit', 'enable'],
  ['reduce', 'lower', 'cut', 'decrease', 'lessen'],
  ['increase', 'raise', 'boost', 'grow', 'rise'],
  ['damage', 'harm', 'hurt', 'injure'],
  ['wet', 'moist', 'damp', 'soaked', 'soggy', 'waterlogged'],
  ['dry', 'parched', 'arid'],
  ['far', 'distance', 'distant', 'away'],
  ['direction', 'way', 'where', 'location', 'place'],
  ['people', 'person', 'public', 'everyone', 'folk'],
  ['often', 'frequently', 'usually', 'commonly'],
  ['important', 'key', 'main', 'vital', 'essential'],
  ['check', 'test', 'verify', 'confirm'],
  ['doctor', 'gp', 'clinician'],
  ['fix', 'repair', 'mend'],
  ['near', 'close', 'nearby', 'beside'],
  ['old', 'ancient', 'aged'],
  ['correct', 'right', 'accurate'],
  ['pay', 'cost', 'charge', 'fee', 'price'],
];
const SYN = new Map<string, string>();
for (const g of SYNONYMS) for (const w of g) SYN.set(w, g[0] as string);

/** Antonym pairs used to detect contradictions despite word overlap. */
const ANTONYMS: [string, string][] = [
  ['increase', 'reduce'], ['more', 'less'], ['more', 'fewer'], ['rise', 'fall'], ['warm', 'cool'],
  ['warmer', 'cooler'], ['hot', 'cold'], ['heat', 'cool'], ['wet', 'dry'], ['consume', 'release'],
  ['absorb', 'release'], ['absorb', 'emit'], ['take', 'give'], ['before', 'after'], ['above', 'below'],
  ['up', 'down'], ['top', 'bottom'], ['early', 'late'], ['earlier', 'later'], ['fast', 'slow'],
  ['easy', 'hard'], ['improve', 'damage'], ['improve', 'worsen'], ['help', 'damage'], ['safe', 'unsafe'],
  ['safe', 'dangerous'], ['allow', 'forbid'], ['allow', 'ban'], ['same', 'different'], ['open', 'close'],
  ['always', 'never'], ['start', 'stop'], ['light', 'heavy'], ['inside', 'outside'], ['north', 'south'],
  ['east', 'west'], ['big', 'small'], ['long', 'short'], ['high', 'low'], ['strong', 'weak'],
  ['add', 'remove'], ['gain', 'lose'], ['success', 'fail'], ['win', 'lose'], ['accept', 'reject'],
  ['include', 'exclude'], ['true', 'false'], ['first', 'last'], ['stable', 'unstable'], ['cheap', 'expensive'],
  ['entry', 'exit'], ['arrive', 'leave'], ['sink', 'float'], ['shrink', 'expand'], ['louder', 'quieter'],
  ['stiff', 'soft'], ['upstream', 'downstream'], ['with', 'against'], ['winter', 'summer'], ['day', 'night'],
  ['same', 'change'], ['remain', 'change'], ['spread', 'contain'], ['enough', 'insufficient'],
];

const NEGATORS = new Set(['not', 'no', 'never', 'without', 'nothing', 'none', 'neither', 'nor', 'avoid', 'avoided', 'exclude', 'excluded']);
const VAGUE_MARKERS = /\b(something|somethin|stuff|things?|it was about|about some|the usual|to do with|some kind|whatever|i think it was)\b/;
const DONT_KNOW = /\b(can not|do not|did not) (remember|recall)\b|\bno idea\b|\bforgot\b|\bforgotten\b|\bnot sure\b/;

function stem(w: string): string {
  let s = w;
  if (s.length <= 3) return s;
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y';
  else if (s.endsWith('sses')) s = s.slice(0, -2);
  else if (s.endsWith('es') && /(sh|ch|x|z|ss)es$/.test(s)) s = s.slice(0, -2);
  else if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us') && !s.endsWith('is')) s = s.slice(0, -1);
  if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
  else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2);
  if (s.endsWith('ly') && s.length > 4) s = s.slice(0, -2);
  if (/([b-df-hj-np-tv-z])\1$/.test(s) && !/(ll|ss|zz)$/.test(s)) s = s.slice(0, -1);
  if (s.endsWith('e') && s.length > 4) s = s.slice(0, -1);
  return s;
}

/** Canonical comparable form of a token: synonym group, then stem. */
function canon(w: string): string {
  const syn = SYN.get(w);
  return stem(syn ?? w);
}

function normalise(text: string): string {
  let t = text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  t = t.replace(FILLERS, ' ');
  t = t.replace(/£\s?(\d[\d,]*)/g, '$1 pounds').replace(/(\d),(\d{3})/g, '$1$2');
  t = t.replace(/-/g, ' ');
  return t;
}

function rawTokens(text: string): string[] {
  return normalise(text).match(/[a-z0-9]+/g) ?? [];
}

/** Convert runs of number words to digits ("twenty five thousand" -> "25000"). */
function numberise(tokens: string[]): string[] {
  const out: string[] = [];
  let acc: number | null = null;
  let cur = 0;
  const flush = () => {
    if (acc !== null) out.push(String(acc + cur));
    acc = null;
    cur = 0;
  };
  for (const t of tokens) {
    const n = NUMBER_WORDS[t];
    if (n === undefined || (t === 'one' && acc === null)) {
      flush();
      out.push(t);
      continue;
    }
    if (acc === null) acc = 0;
    if (n === 100) cur = (cur || 1) * 100;
    else if (n === 1000) {
      acc += (cur || 1) * 1000;
      cur = 0;
    } else cur += n;
  }
  flush();
  return out;
}

function contentTokens(text: string): string[] {
  return numberise(rawTokens(text)).filter((t) => /^\d+$/.test(t) || (!isStopword(t) && t.length > 2));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array<number>(n).fill(0)]);
  for (let j = 1; j <= n; j++) (d[0] as number[])[j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const row = d[i] as number[];
      const prev = d[i - 1] as number[];
      row[j] = Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return (d[m] as number[])[n] as number;
}

/** Rough phonetic key: consonant skeleton with common English sound merges. */
function phonetic(w: string): string {
  let s = w.toLowerCase();
  s = s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/gh/g, '').replace(/^kn/, 'n').replace(/^wr/, 'r').replace(/^wh/, 'w');
  s = s.replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's').replace(/dg/g, 'j');
  s = s.replace(/tion/g, 'shn').replace(/sion/g, 'shn');
  const first = s[0] ?? '';
  const rest = s.slice(1).replace(/[aeiouy]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1');
}

/** Inflected forms of the same word (stay/stays, form/forms, different/difference) are not mishearings. */
function sameWordFamily(a: string, b: string): boolean {
  if (stem(a) === stem(b)) return true;
  const n = Math.min(a.length, b.length);
  if (n >= 4 && (a.startsWith(b.slice(0, n - 1)) || b.startsWith(a.slice(0, n - 1)))) return true;
  let k = 0;
  while (k < n && a[k] === b[k]) k++;
  return k >= 6;
}

function soundsAlike(a: string, b: string): boolean {
  if (a === b || sameWordFamily(a, b)) return false;
  if (a.length < 3 || b.length < 3) return false;
  const pa = phonetic(a);
  const pb = phonetic(b);
  if (pa.length >= 2 && pa === pb) return true;
  if (b.length < 4) return false;
  // A dropped or added first sound ("table" for "stable").
  if (a.length >= 4 && (a === b.slice(1) || b === a.slice(1))) return true;
  const d = levenshtein(a, b);
  return a[0] === b[0] && d <= 2 && d / Math.max(a.length, b.length) <= 0.34 && Math.abs(a.length - b.length) <= 2;
}

interface AsrFinding {
  heard: string;
  likely: string;
}

/** Words in the transcript that sound like a source word that the transcript does not contain. */
export function findAsrSuspects(source: string, ideas: string[], transcript: string): AsrFinding[] {
  const srcWords = new Set(rawTokens([source, ...ideas].join(' ')).filter((w) => w.length >= 3 && !isStopword(w)));
  const srcCanon = new Set([...srcWords].map(canon));
  const tr = rawTokens(transcript);
  const trCanon = new Set(tr.map(canon));
  const missing = [...srcWords].filter((s) => !trCanon.has(canon(s)));
  const findings: AsrFinding[] = [];
  for (let i = 0; i < tr.length; i++) {
    const t = tr[i] as string;
    // Two heard words that join into one source word ("die oxide" -> "dioxide", "a tension" -> "attention").
    const next = tr[i + 1];
    if (next && !srcCanon.has(canon(next))) {
      const joined = t + next;
      const hit = missing.find((s) => s.length >= 6 && (s === joined || soundsAlike(joined, s)));
      if (hit) {
        findings.push({ heard: `${t} ${next}`, likely: hit });
        i++;
        continue;
      }
    }
    if (isStopword(t) || srcCanon.has(canon(t)) || NUMBER_WORDS[t] !== undefined) continue;
    if (t.length < 3) continue;
    const hit = missing.find((s) => soundsAlike(t, s));
    if (hit) findings.push({ heard: t, likely: hit });
  }
  return findings;
}

function negatedNear(tokens: string[], idx: number, window = 2): boolean {
  for (let j = Math.max(0, idx - window); j < idx; j++) if (NEGATORS.has(tokens[j] as string)) return true;
  return false;
}

interface Signal {
  kind: 'antonym' | 'negation' | 'number';
  detail: string;
}

function contradictionSignals(sourceAndIdeas: string, transcript: string): Signal[] {
  const sig: Signal[] = [];
  const sTok = numberise(rawTokens(sourceAndIdeas));
  const tTok = numberise(rawTokens(transcript));
  const sCanon = new Set(sTok.map(canon));
  const tCanon = new Set(tTok.map(canon));
  for (const [a, b] of ANTONYMS) {
    const ca = canon(a);
    const cb = canon(b);
    if (tCanon.has(ca) && !tCanon.has(cb) && sCanon.has(cb) && !sCanon.has(ca)) sig.push({ kind: 'antonym', detail: `${a} vs ${b}` });
    if (tCanon.has(cb) && !tCanon.has(ca) && sCanon.has(ca) && !sCanon.has(cb)) sig.push({ kind: 'antonym', detail: `${b} vs ${a}` });
  }
  // Negation flips on shared content words.
  const sNeg = new Map<string, boolean>();
  sTok.forEach((w, i) => {
    if (!isStopword(w) && w.length > 3) sNeg.set(canon(w), (sNeg.get(canon(w)) ?? false) || negatedNear(sTok, i));
  });
  tTok.forEach((w, i) => {
    if (isStopword(w) || w.length <= 3) return;
    const c = canon(w);
    if (!sNeg.has(c)) return;
    const tn = negatedNear(tTok, i);
    const sn = sNeg.get(c) as boolean;
    if (tn !== sn) sig.push({ kind: 'negation', detail: `${tn ? 'not ' : ''}${w}` });
  });
  // Numbers stated that differ from every number in the source.
  const sNums = new Set(sTok.filter((t) => /^\d+$/.test(t)));
  const tNums = tTok.filter((t) => /^\d+$/.test(t));
  if (sNums.size > 0) for (const n of tNums) if (!sNums.has(n)) sig.push({ kind: 'number', detail: n });
  return sig;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Score one recall attempt. Deterministic. Never throws on user text. */
export function scoreRecallLocally(input: ScorerInput): ScorerOutput {
  const source = input.sourceText.slice(0, SCORER_LIMITS.sourceChars);
  const ideas = input.keyIdeas.slice(0, SCORER_LIMITS.ideas);
  const transcript = input.transcript.slice(0, SCORER_LIMITS.transcriptChars);
  const base = { experimental: true as const };
  const tContent = contentTokens(transcript);

  // Empty / "I don't remember".
  if (tContent.length === 0 || DONT_KNOW.test(normalise(transcript))) {
    return { ...base, label: 'incorrect', score: 0, clueLevel: 3, action: 'give_clue', ideaScores: ideas.map((i) => ({ ideaId: i.id, coverage: 0, contradiction: false })), evidence: ['No recalled content to compare with the source.'] };
  }

  // 1. ASR uncertainty first: never score memory from a possibly corrupted transcript.
  const asr = findAsrSuspects(source, ideas.map((i) => i.text), transcript);
  if (asr.length > 0) {
    return {
      ...base,
      label: 'asr_uncertain',
      score: null,
      clueLevel: null,
      action: 'confirm_transcript',
      ideaScores: [],
      evidence: asr.map((a) => `Heard “${a.heard}” — did you mean “${a.likely}”? Please confirm before checking.`),
    };
  }

  // 2. Coverage of each idea.
  const tSet = new Set(tContent.map(canon));
  const srcSet = new Set(contentTokens(source).map(canon));
  const ideaScores: IdeaScore[] = ideas.map((idea) => {
    const words = [...new Set(contentTokens(idea.text).map(canon))];
    const hit = words.filter((w) => tSet.has(w)).length;
    return { ideaId: idea.id, coverage: words.length ? hit / words.length : 0, contradiction: false };
  });
  const supported = tContent.filter((w) => srcSet.has(canon(w)) || ideas.some((i) => contentTokens(i.text).map(canon).includes(canon(w)))).length;
  const sourceOverlap = supported / Math.max(1, tContent.length);
  const meanCov = ideaScores.reduce((a, b) => a + b.coverage, 0) / Math.max(1, ideaScores.length);

  // 3. Contradiction overrides overlap.
  const signals = contradictionSignals([source, ...ideas.map((i) => i.text)].join(' '), transcript);
  if (signals.length > 0 && (meanCov >= 0.15 || sourceOverlap >= 0.3)) {
    for (const s of ideaScores) s.contradiction = s.coverage > 0;
    return {
      ...base,
      label: 'contradiction',
      score: round3(Math.min(0.1, 0.05 * meanCov)),
      clueLevel: 2,
      action: 'correct_misconception_then_cue',
      ideaScores,
      evidence: signals.slice(0, 3).map((s) => `Possible contradiction of the source (${s.kind}: ${s.detail}).`),
    };
  }

  const covered = ideaScores.filter((s) => s.coverage >= 0.4).length;
  const evidence = ideaScores.map((s, k) => `Key idea ${k + 1}: ${Math.round(s.coverage * 100)}% of its content words recalled.`);
  if (covered === ideas.length && ideas.length > 0) {
    return { ...base, label: 'correct', score: round3(Math.min(1, 0.86 + 0.14 * meanCov)), clueLevel: 0, action: 'accept', ideaScores, evidence };
  }
  if (covered > 0 || meanCov >= 0.3) {
    return { ...base, label: 'partial', score: round3(0.5 + 0.2 * Math.min(1, meanCov)), clueLevel: 1, action: 'prompt_more', ideaScores, evidence };
  }
  const vague = VAGUE_MARKERS.test(normalise(transcript)) || tContent.length <= 3;
  if (vague && sourceOverlap > 0) {
    return { ...base, label: 'vague', score: 0.3, clueLevel: 1, action: 'prompt_specifics', ideaScores, evidence: ['The answer names the topic but not the specific points.'] };
  }
  return { ...base, label: 'incorrect', score: round3(Math.min(0.2, meanCov * 0.5)), clueLevel: 3, action: 'give_clue', ideaScores, evidence };
}
