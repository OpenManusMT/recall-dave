/**
 * Small, dependency-free text utilities shared by chunking, clues, grounding
 * and scoring. All functions are pure and deterministic.
 */

/** Count words the way a reader would (hyphenated words and numbers count once). */
export function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-.,:/]*/gu);
  return m ? m.length : 0;
}

/** Collapse whitespace and normalise curly quotes so spans can be compared reliably. */
export function normaliseSpace(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

const ABBREVIATIONS = [
  'Mr',
  'Mrs',
  'Ms',
  'Dr',
  'St',
  'Prof',
  'Rev',
  'Sr',
  'Jr',
  'e.g',
  'i.e',
  'etc',
  'approx',
  'vs',
  'No',
];

/**
 * Split text into sentences. Handles common abbreviations, decimal numbers and
 * closing quotes/brackets. Returns trimmed sentences that reproduce the source
 * text exactly when joined with single spaces (after whitespace normalisation).
 */
export function splitSentences(text: string): string[] {
  const src = text.replace(/\s+/g, ' ').trim();
  if (!src) return [];
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    // Absorb closing quotes / brackets and repeated punctuation.
    let end = i + 1;
    while (end < src.length && /["'’”)\]!?.]/.test(src[end] ?? '')) end++;
    const next = src[end];
    if (next !== undefined && next !== ' ') continue; // e.g. 3.5 or "e.g."
    if (ch === '.') {
      const before = src.slice(start, i);
      const lastWord = before.split(' ').pop() ?? '';
      if (ABBREVIATIONS.some((a) => lastWord === a || lastWord.endsWith(' ' + a))) continue;
      // Single capital initial such as "J. Smith".
      if (/^[A-Z]$/.test(lastWord)) continue;
    }
    // A sentence must be followed by a capital letter, digit or quote to end here.
    const after = src.slice(end + 1, end + 3);
    if (next === ' ' && after && !/^["'‘“(]?[\p{Lu}\p{N}]/u.test(after)) continue;
    out.push(src.slice(start, end).trim());
    start = end + 1;
    i = end;
  }
  const rest = src.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Split into paragraphs on blank lines (or single newlines when no blank lines exist). */
export function splitParagraphs(text: string): string[] {
  const cleaned = text.replace(/\r\n?/g, '\n').trim();
  if (!cleaned) return [];
  const byBlank = cleaned.split(/\n\s*\n+/);
  const paras = byBlank.length > 1 ? byBlank : cleaned.split(/\n+/);
  return paras.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Does `span` occur verbatim in `text` (ignoring whitespace and curly-quote differences)? */
export function containsSpan(text: string, span: string): boolean {
  const s = normaliseSpace(span);
  return s.length > 0 && normaliseSpace(text).includes(s);
}

/** Lower-case word tokens with apostrophes removed; numbers kept. */
export function wordTokens(text: string): string[] {
  return (
    normaliseSpace(text)
      .toLowerCase()
      .replace(/(\p{L})'(\p{L})/gu, '$1$2')
      .match(/[\p{L}\p{N}£$%]+(?:[.,]\d+)?/gu) ?? []
  );
}

/** Remove characters that should never appear in stored reading text. */
export function sanitiseReadingText(text: string): string {
  return (
    text
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
