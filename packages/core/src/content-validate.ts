import type { AuthoredIdea, AuthoredPassage } from './content-types';
import { RELATIONS } from './content-types';
import { containsSpan, countWords, normaliseSpace } from './text';

/**
 * Qualifiers that change meaning. If one of these appears in an idea's
 * supporting span it must be declared in `qualifiers` and preserved (or an
 * accepted equivalent used) in the plain-language idea text.
 */
export const CRITICAL_QUALIFIERS: Record<string, string[]> = {
  usually: ['usually', 'normally', 'generally', 'typically', 'most of the time', 'tend', 'tends'],
  often: ['often', 'usually', 'frequently', 'many', 'tend', 'tends', 'commonly'],
  sometimes: ['sometimes', 'can', 'may', 'occasionally', 'some'],
  rarely: ['rarely', 'seldom', 'hardly ever', 'not often'],
  may: ['may', 'might', 'can', 'could', 'possibly', 'sometimes'],
  might: ['might', 'may', 'can', 'could', 'possibly'],
  unless: ['unless', 'except', 'only if', 'only when', 'but not', 'apart from'],
  except: ['except', 'unless', 'apart from', 'but not', 'other than', 'not'],
  only: ['only', 'just', 'alone', 'solely'],
  about: ['about', 'around', 'roughly', 'approximately', 'nearly', 'some', 'almost'],
  around: ['around', 'about', 'roughly', 'approximately', 'nearly', 'some'],
  roughly: ['roughly', 'about', 'around', 'approximately'],
  approximately: ['approximately', 'about', 'around', 'roughly'],
  almost: ['almost', 'nearly', 'about', 'just under', 'virtually'],
  nearly: ['nearly', 'almost', 'about', 'just under'],
  most: ['most', 'mostly', 'usually', 'majority', 'many', 'main'],
  generally: ['generally', 'usually', 'normally', 'tend', 'tends'],
  typically: ['typically', 'usually', 'normally', 'generally'],
  never: ['never', 'not', 'no', "don't", "doesn't", "won't", 'avoid'],
  not: ['not', "n't", 'no', 'never', 'avoid', 'without', 'instead of', 'rather than'],
};

const US_SPELLINGS = [
  'color',
  'colors',
  'colored',
  'center',
  'centers',
  'favorite',
  'neighbor',
  'neighbors',
  'behavior',
  'gray',
  'meter',
  'meters',
  'liter',
  'liters',
  'traveled',
  'traveling',
  'mold',
  'flavor',
  'harbor',
  'honor',
  'labor',
  'theater',
  'fiber',
  'aluminum',
  'organize',
  'organized',
  'recognize',
  'realize',
  'analyze',
  'defense',
  'catalog',
  'program',
  'jewelry',
  'pajamas',
  'cozy',
];

function hasWord(haystack: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]");
  return new RegExp(`(^|[^\\p{L}])${esc}(?=[^\\p{L}]|$)`, 'iu').test(haystack);
}

/** Qualifier words (keys of CRITICAL_QUALIFIERS) that appear in the given text. */
export function findCriticalQualifiers(text: string): string[] {
  return Object.keys(CRITICAL_QUALIFIERS).filter((q) =>
    q === 'not' ? /\bnot\b|n['’]t\b/i.test(text) : hasWord(text, q),
  );
}

function validateIdea(idea: AuthoredIdea, sectionText: string, where: string): string[] {
  const errs: string[] = [];
  if (!idea.text.trim()) errs.push(`${where}: empty idea text`);
  if (idea.text.length > 160) errs.push(`${where}: idea text longer than 160 characters`);
  if (!RELATIONS.includes(idea.relation)) errs.push(`${where}: unknown relation ${idea.relation}`);
  if (idea.sourceSpans.length === 0) errs.push(`${where}: no source spans`);
  for (const span of idea.sourceSpans) {
    if (!containsSpan(sectionText, span)) errs.push(`${where}: span not found verbatim: "${span}"`);
    if (countWords(span) < 3) errs.push(`${where}: span too short to be evidence: "${span}"`);
  }
  const spansJoined = idea.sourceSpans.join(' ');
  const present = findCriticalQualifiers(spansJoined);
  for (const q of present) {
    if (!idea.qualifiers.map((x) => x.toLowerCase()).includes(q)) {
      errs.push(`${where}: qualifier "${q}" appears in span but is not declared`);
    }
  }
  for (const q of idea.qualifiers) {
    const key = q.toLowerCase();
    const inSpan =
      key === 'not'
        ? findCriticalQualifiers(spansJoined).includes('not')
        : hasWord(spansJoined, key);
    if (!inSpan) errs.push(`${where}: declared qualifier "${q}" not found in spans`);
    const equivalents = CRITICAL_QUALIFIERS[key] ?? [key];
    const preserved = equivalents.some((e) =>
      e === "n't" ? /n['’]t\b/i.test(idea.text) : hasWord(idea.text, e),
    );
    if (!preserved) errs.push(`${where}: qualifier "${q}" not preserved in idea text`);
  }
  if (!idea.topic.trim() || idea.topic.length > 60)
    errs.push(`${where}: topic missing or > 60 chars`);
  if (!idea.semanticCue.trim() || idea.semanticCue.length > 140) {
    errs.push(`${where}: semanticCue missing or > 140 chars`);
  }
  if (idea.clozeAnswers.length < 1 || idea.clozeAnswers.length > 3) {
    errs.push(`${where}: needs 1–3 clozeAnswers`);
  }
  const firstSpan = idea.sourceSpans[0] ?? '';
  for (const c of idea.clozeAnswers) {
    if (!normaliseSpace(firstSpan).includes(normaliseSpace(c))) {
      errs.push(`${where}: cloze answer "${c}" not in first span`);
    }
  }
  // The cue must not simply repeat the answer.
  if (normaliseSpace(idea.semanticCue).toLowerCase() === normaliseSpace(idea.text).toLowerCase()) {
    errs.push(`${where}: semantic cue repeats the idea`);
  }
  return errs;
}

/** Validate a bundled passage. Returns a list of human-readable problems (empty = valid). */
export function validatePassage(p: AuthoredPassage): string[] {
  const errs: string[] = [];
  const where = p.id || '(no id)';
  if (!/^(p\d{2}|probe-\d{2})-[a-z0-9-]+$/.test(p.id)) errs.push(`${where}: bad id format`);
  if (p.kind === 'probe' && !p.id.startsWith('probe-'))
    errs.push(`${where}: probe id must start probe-`);
  if (p.kind === 'library' && p.id.startsWith('probe-'))
    errs.push(`${where}: library id must not start probe-`);
  if (!p.title.trim()) errs.push(`${where}: missing title`);
  if (!p.summary.trim() || p.summary.length > 120)
    errs.push(`${where}: summary missing or > 120 chars`);
  if (!p.factNotes.trim()) errs.push(`${where}: missing factNotes`);
  const nSections = p.sections.length;
  if (p.kind === 'library' && (nSections < 2 || nSections > 4)) {
    errs.push(`${where}: library passages need 2–4 sections`);
  }
  if (p.kind === 'probe' && nSections !== 1) errs.push(`${where}: probes need exactly 1 section`);
  const ids = new Set<string>();
  const addId = (id: string) => {
    if (ids.has(id)) errs.push(`${where}: duplicate id ${id}`);
    ids.add(id);
  };
  for (const s of p.sections) {
    const sw = `${where}/${s.id}`;
    addId(s.id);
    const wc = countWords(s.text);
    if (wc < 35 || wc > 110) errs.push(`${sw}: section has ${wc} words (allowed 35–110)`);
    if (/https?:\/\/|www\./i.test(s.text)) errs.push(`${sw}: section contains a link`);
    for (const w of US_SPELLINGS) {
      if (hasWord(s.text, w)) errs.push(`${sw}: US spelling "${w}"`);
    }
    if (s.ideas.length < 1 || s.ideas.length > 2) errs.push(`${sw}: needs 1–2 ideas`);
    for (const idea of s.ideas) {
      addId(idea.id);
      errs.push(...validateIdea(idea, s.text, `${sw}/${idea.id}`));
    }
    const q = s.question;
    addId(q.id);
    if (!q.prompt.trim()) errs.push(`${sw}/${q.id}: empty prompt`);
    if (q.options.length !== 3) errs.push(`${sw}/${q.id}: needs exactly 3 options`);
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) {
      errs.push(`${sw}/${q.id}: duplicate options`);
    }
    if (
      !Number.isInteger(q.answerIndex) ||
      q.answerIndex < 0 ||
      q.answerIndex >= q.options.length
    ) {
      errs.push(`${sw}/${q.id}: answerIndex out of range`);
    }
    if (!containsSpan(s.text, q.explanationSpan)) {
      errs.push(`${sw}/${q.id}: explanationSpan not found verbatim`);
    }
  }
  return errs;
}

/** Validate a whole library, including cross-passage uniqueness and probe separation. */
export function validateLibrary(passages: AuthoredPassage[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const p of passages) {
    if (seen.has(p.id)) errs.push(`duplicate passage id ${p.id}`);
    seen.add(p.id);
    errs.push(...validatePassage(p));
  }
  const titles = passages.map((p) => p.title.toLowerCase());
  if (new Set(titles).size !== titles.length) errs.push('duplicate passage titles');
  return errs;
}
