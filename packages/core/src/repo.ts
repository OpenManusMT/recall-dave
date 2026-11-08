/**
 * Application operations on top of a RecallStore. Shared by the PWA and the
 * native app so the behaviour (and its tests) is identical on both.
 */
import type { AuthoredPassage } from './content-types';
import type {
  AttemptKind,
  ChunkAttempt,
  ChunkRecord,
  IdeaCheck,
  KeyIdeaSnapshot,
  MemoryState,
  QuestionResult,
  ReadingDocument,
  ReviewLogEntry,
  SessionDraft,
  SessionRecord,
  Settings,
  StrategyName,
} from './types';
import type { RecallStore, StoreOp } from './store';
import { deleteOp, putOp, readSnapshot } from './store';
import { planAuthoredChunks, planPastedChunks, type PlannedChunk } from './chunker';
import { currentChunkTarget, normaliseSettings } from './settings';
import { isDue, scheduleFirstExposure, scheduleReview } from './scheduler';
import { calendarDaysBetween, toISO } from './dates';
import { newId } from './ids';
import { countWords, sanitiseReadingText, splitParagraphs } from './text';
import { applyAdaptation, decideAdaptation } from './adaptation';

export const MAX_PASTED_CHARS = 20_000;
export const MAX_TITLE_CHARS = 120;
export const MAX_RECALL_CHARS = 4_000;

// ---------------------------------------------------------------- settings

export async function getSettings(store: RecallStore): Promise<Settings> {
  return normaliseSettings(await store.get('settings', 'settings'));
}

export async function saveSettings(store: RecallStore, s: Settings): Promise<Settings> {
  const n = normaliseSettings(s);
  await store.batch([putOp('settings', n)]);
  return n;
}

// --------------------------------------------------------------- documents

function chunkRecords(
  docId: string,
  planned: PlannedChunk[],
  startIndex: number,
  target: number,
  now: Date,
): ChunkRecord[] {
  return planned.map((p, i) => ({
    id: newId('chk'),
    documentId: docId,
    index: startIndex + i,
    text: p.text,
    wordCount: p.wordCount,
    plannedTargetWords: target,
    sectionIds: p.sectionIds,
    ideas: p.ideas,
    questions: p.questions,
    createdAt: toISO(now),
    superseded: false,
  }));
}

export async function getDocumentChunks(
  store: RecallStore,
  documentId: string,
): Promise<ChunkRecord[]> {
  const all = await store.getAll('chunks');
  return all
    .filter((c) => c.documentId === documentId && !c.superseded)
    .sort((a, b) => a.index - b.index);
}

function chunkOptions(settings: Settings, target = currentChunkTarget(settings)) {
  return {
    targetWords: target,
    minWords: settings.minChunkWords,
    maxWords: settings.maxChunkWords,
    maxIdeas: 3,
  };
}

/**
 * Find the open (not finished) document for a bundled passage, or create it
 * and plan its chunks with the current comfortable size.
 */
export async function openPassage(
  store: RecallStore,
  passage: AuthoredPassage,
  settings: Settings,
  now: Date,
): Promise<{ document: ReadingDocument; chunks: ChunkRecord[] }> {
  const docs = await store.getAll('documents');
  const existing = docs
    .filter((d) => d.passageId === passage.id && d.status !== 'finished')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  if (existing) return { document: existing, chunks: await getDocumentChunks(store, existing.id) };

  const target = currentChunkTarget(settings);
  const planned = planAuthoredChunks(passage, chunkOptions(settings, target));
  const document: ReadingDocument = {
    id: newId('doc'),
    title: passage.title,
    text: passage.sections.map((s) => s.text).join('\n\n'),
    createdAt: toISO(now),
    updatedAt: toISO(now),
    provenance: passage.kind === 'probe' ? 'probe' : 'sample',
    passageId: passage.id,
    status: 'new',
    nextChunkIndex: 0,
    chunkCount: planned.length,
  };
  const chunks = chunkRecords(document.id, planned, 0, target, now);
  await store.batch([putOp('documents', document), ...chunks.map((c) => putOp('chunks', c))]);
  return { document, chunks };
}

export type PasteValidation =
  { ok: true; text: string; title: string } | { ok: false; error: string };

export function validatePastedReading(rawTitle: string, rawText: string): PasteValidation {
  const text = sanitiseReadingText(rawText ?? '');
  if (!text) return { ok: false, error: 'Please paste or type some text to read.' };
  if (text.length > MAX_PASTED_CHARS) {
    return {
      ok: false,
      error: `That text is too long. Please paste up to ${MAX_PASTED_CHARS.toLocaleString('en-GB')} characters at a time.`,
    };
  }
  if (countWords(text) < 15)
    return {
      ok: false,
      error: 'Please paste a little more text — at least a couple of sentences.',
    };
  const title =
    sanitiseReadingText(rawTitle ?? '')
      .replace(/\s+/g, ' ')
      .slice(0, MAX_TITLE_CHARS) ||
    (splitParagraphs(text)[0] ?? 'My reading')
      .split(/\s+/)
      .slice(0, 6)
      .join(' ')
      .replace(/[.,;:]+$/, '') + '…';
  return { ok: true, text, title };
}

export async function createPastedDocument(
  store: RecallStore,
  input: { title: string; text: string },
  settings: Settings,
  now: Date,
): Promise<{ document: ReadingDocument; chunks: ChunkRecord[] }> {
  const v = validatePastedReading(input.title, input.text);
  if (!v.ok) throw new Error(v.error);
  const id = newId('doc');
  const target = currentChunkTarget(settings);
  const planned = planPastedChunks(
    v.text,
    chunkOptions(settings, target),
    `${id}:${newId('p').slice(-6)}`,
  );
  const document: ReadingDocument = {
    id,
    title: v.title,
    text: v.text,
    createdAt: toISO(now),
    updatedAt: toISO(now),
    provenance: 'pasted',
    passageId: null,
    status: 'new',
    nextChunkIndex: 0,
    chunkCount: planned.length,
  };
  const chunks = chunkRecords(id, planned, 0, target, now);
  await store.batch([putOp('documents', document), ...chunks.map((c) => putOp('chunks', c))]);
  return { document, chunks };
}

/**
 * Re-plan the unread part of a document with a new target size (used by
 * "Too much text" and by manual size changes). Chunks before `fromIndex` are
 * kept untouched. If `fromIndex` points at a chunk that is only part of a
 * section, re-planning starts after it.
 */
export async function replanFrom(
  store: RecallStore,
  documentId: string,
  fromIndex: number,
  targetWords: number,
  settings: Settings,
  passage: AuthoredPassage | null,
  now: Date,
): Promise<ChunkRecord[]> {
  const doc = await store.get('documents', documentId);
  if (!doc) throw new Error('Reading not found');
  const chunks = await getDocumentChunks(store, documentId);
  const opts = chunkOptions(settings, targetWords);
  let start = Math.max(0, Math.min(fromIndex, chunks.length));
  let planned: PlannedChunk[];
  if (passage) {
    const first = chunks[start];
    if (!first) return chunks;
    let sectionIdx = passage.sections.findIndex((s) => s.id === first.sectionIds[0]);
    const section = passage.sections[sectionIdx];
    const startsSection = section
      ? section.text.replace(/\s+/g, ' ').startsWith(first.text.slice(0, 40))
      : false;
    if (!startsSection) {
      // Partial section: keep this chunk and re-plan from the next whole section.
      const lastSection = first.sectionIds[first.sectionIds.length - 1];
      sectionIdx = passage.sections.findIndex((s) => s.id === lastSection) + 1;
      start += 1;
      if (sectionIdx >= passage.sections.length) return chunks;
    }
    planned = planAuthoredChunks(passage, opts, sectionIdx);
  } else {
    const remaining = chunks
      .slice(start)
      .map((c) => c.text)
      .join('\n\n');
    if (!remaining.trim()) return chunks;
    planned = planPastedChunks(remaining, opts, `${documentId}:${newId('p').slice(-6)}`);
  }
  const fresh = chunkRecords(documentId, planned, start, targetWords, now);
  const ops: StoreOp[] = [];
  for (const c of chunks.slice(start)) ops.push(putOp('chunks', { ...c, superseded: true }));
  for (const c of fresh) ops.push(putOp('chunks', c));
  ops.push(
    putOp('documents', {
      ...doc,
      chunkCount: start + fresh.length,
      nextChunkIndex: Math.min(doc.nextChunkIndex, start + fresh.length),
      readNextChunkIndex: Math.min(doc.readNextChunkIndex ?? 0, start + fresh.length),
      updatedAt: toISO(now),
    }),
  );
  await store.batch(ops);
  return getDocumentChunks(store, documentId);
}

// ---------------------------------------------------------------- sessions

export async function getActiveSession(store: RecallStore): Promise<SessionRecord | undefined> {
  const sessions = await store.getAll('sessions');
  return sessions
    .filter((s) => s.status === 'active')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

/**
 * Start a session. Applies at most one chunk-size adaptation (one variable,
 * once per session) and records the reason so it can be shown and audited.
 */
export async function startSession(
  store: RecallStore,
  mode: SessionRecord['mode'],
  now: Date,
): Promise<{ session: SessionRecord; settings: Settings }> {
  const [settings, attempts, reviewLog] = await Promise.all([
    getSettings(store),
    store.getAll('attempts'),
    store.getAll('reviewLog'),
  ]);
  const id = newId('ses');
  const decision = decideAdaptation({ attempts, reviewLog, settings });
  const nextSettings = applyAdaptation(settings, decision, id, now);
  const session: SessionRecord = {
    id,
    startedAt: toISO(now),
    updatedAt: toISO(now),
    endedAt: null,
    status: 'active',
    mode,
    adaptation: decision,
    attemptIds: [],
    draft: null,
  };
  // Close any session left open (e.g. the app was closed mid-session), carrying its unsaved
  // draft over so a half-written answer is never silently lost.
  const open = (await store.getAll('sessions'))
    .filter((s) => s.status === 'active')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  session.draft = open[0]?.draft ?? null;
  await store.batch([
    ...open.map((s) =>
      putOp('sessions', { ...s, status: 'finished' as const, endedAt: s.updatedAt, draft: null }),
    ),
    putOp('sessions', session),
    putOp('settings', nextSettings),
  ]);
  return { session, settings: nextSettings };
}

export async function saveDraft(
  store: RecallStore,
  sessionId: string,
  draft: SessionDraft | null,
  now: Date,
) {
  const s = await store.get('sessions', sessionId);
  if (!s || s.status !== 'active') return;
  const safeDraft = draft
    ? { ...draft, recallText: draft.recallText.slice(0, MAX_RECALL_CHARS) }
    : null;
  await store.batch([putOp('sessions', { ...s, draft: safeDraft, updatedAt: toISO(now) })]);
}

export async function finishSession(
  store: RecallStore,
  sessionId: string,
  now: Date,
): Promise<SessionRecord | undefined> {
  const s = await store.get('sessions', sessionId);
  if (!s) return undefined;
  if (s.status === 'finished') return s;
  const done: SessionRecord = {
    ...s,
    status: 'finished',
    endedAt: toISO(now),
    updatedAt: toISO(now),
    draft: null,
  };
  await store.batch([putOp('sessions', done)]);
  return done;
}

export async function logStrategy(
  store: RecallStore,
  sessionId: string,
  strategy: StrategyName,
  chunkId: string | null,
  now: Date,
) {
  await store.batch([
    putOp('strategy', { id: newId('str'), sessionId, strategy, chunkId, at: toISO(now) }),
  ]);
}

// ---------------------------------------------------------------- attempts

export interface AttemptInput {
  attemptId: string;
  sessionId: string;
  documentId: string;
  chunkId: string;
  kind: AttemptKind;
  startedAt: string;
  recallText: string;
  textPeeks: number;
  ideas: IdeaCheck[];
  question: QuestionResult | null;
  tooMuch: boolean;
  /** "Help me read this" mode: also add the points to reviews. */
  addToReviews?: boolean;
}

export interface AttemptOutcome {
  attempt: ChunkAttempt;
  logs: ReviewLogEntry[];
  states: MemoryState[];
  duplicate: boolean;
}

/**
 * Record a finished chunk attempt and update every key idea's schedule —
 * atomically and idempotently (a repeated tap with the same attempt id is a no-op).
 */
export async function recordAttempt(
  store: RecallStore,
  input: AttemptInput,
  now: Date,
): Promise<AttemptOutcome> {
  const existing = await store.get('attempts', input.attemptId);
  if (existing) {
    const logs = (await store.getAll('reviewLog')).filter((l) => l.attemptId === existing.id);
    return { attempt: existing, logs, states: [], duplicate: true };
  }
  const [chunk, doc, session] = await Promise.all([
    store.get('chunks', input.chunkId),
    store.get('documents', input.documentId),
    store.get('sessions', input.sessionId),
  ]);
  if (!chunk || !doc) throw new Error('This reading is no longer available.');
  const ideaIds = new Set(chunk.ideas.map((i) => i.id));
  for (const c of input.ideas) {
    if (!ideaIds.has(c.ideaId)) throw new Error('Unknown key idea for this part.');
    if (!Number.isInteger(c.clueLevel) || c.clueLevel < 0 || c.clueLevel > 5)
      throw new Error('Invalid clue level.');
  }
  const priorStates = new Map<string, MemoryState>();
  for (const c of input.ideas) {
    const st = await store.get('memory', c.ideaId);
    if (st) priorStates.set(c.ideaId, st);
  }
  const firstExposure = input.kind !== 'review' && priorStates.size === 0;
  const lastSeen = [...priorStates.values()]
    .map((s) => s.lastReviewAt)
    .sort()
    .pop();
  const elapsedDays =
    input.kind === 'review' && lastSeen
      ? Math.max(0, calendarDaysBetween(new Date(lastSeen), now))
      : null;

  const attempt: ChunkAttempt = {
    id: input.attemptId,
    sessionId: input.sessionId,
    documentId: input.documentId,
    chunkId: input.chunkId,
    kind: input.kind,
    startedAt: input.startedAt,
    completedAt: toISO(now),
    recallText: (input.recallText ?? '').slice(0, MAX_RECALL_CHARS),
    inputMethod: 'typed',
    textPeeks: Math.max(0, Math.floor(input.textPeeks)),
    ideas: input.ideas.map((i) => ({
      ideaId: i.ideaId,
      outcome: i.outcome,
      clueLevel: i.clueLevel,
    })),
    question: input.question,
    tooMuch: input.tooMuch,
    firstExposure,
    elapsedDays,
  };

  const ops: StoreOp[] = [putOp('attempts', attempt)];
  const logs: ReviewLogEntry[] = [];
  const states: MemoryState[] = [];
  const schedule =
    input.kind === 'learn' ||
    input.kind === 'review' ||
    (input.kind === 'read' && input.addToReviews);
  if (schedule) {
    for (const c of input.ideas) {
      const prev = priorStates.get(c.ideaId);
      const upd = prev
        ? scheduleReview(prev, c.outcome, c.clueLevel, now)
        : scheduleFirstExposure({
            ideaId: c.ideaId,
            chunkId: chunk.id,
            documentId: doc.id,
            isProbe: false,
            outcome: c.outcome,
            clueLevel: c.clueLevel,
            now,
          });
      const log: ReviewLogEntry = {
        id: `${attempt.id}:${c.ideaId}`,
        attemptId: attempt.id,
        ideaId: c.ideaId,
        at: toISO(now),
        kind: prev ? (input.kind === 'review' ? 'review' : input.kind) : input.kind,
        outcome: c.outcome,
        clueLevel: c.clueLevel,
        grade: upd.grade,
        elapsedDays: upd.elapsedDays,
        authoritativeDueBefore: prev?.authoritativeNextAt ?? null,
        recommendedBefore: prev?.recommendedNextAt ?? null,
        authoritativeNextAt: upd.state.authoritativeNextAt,
        recommendedNextAt: upd.state.recommendedNextAt,
        retrievabilityBefore: upd.retrievabilityBefore,
      };
      logs.push(log);
      states.push(upd.state);
      ops.push(putOp('memory', upd.state), putOp('reviewLog', log));
    }
  }
  if (input.kind === 'read') {
    // "Help me read" keeps its own position so it never skips parts to be practised.
    ops.push(
      putOp('documents', {
        ...doc,
        readNextChunkIndex: Math.max(doc.readNextChunkIndex ?? 0, chunk.index + 1),
        updatedAt: toISO(now),
      }),
    );
  } else if (input.kind !== 'review') {
    const next = Math.max(doc.nextChunkIndex, chunk.index + 1);
    ops.push(
      putOp('documents', {
        ...doc,
        nextChunkIndex: next,
        status: next >= doc.chunkCount ? 'finished' : 'in_progress',
        updatedAt: toISO(now),
      }),
    );
  }
  if (session) {
    ops.push(
      putOp('sessions', {
        ...session,
        attemptIds: [...session.attemptIds, attempt.id],
        draft: null,
        updatedAt: toISO(now),
      }),
    );
  }
  await store.batch(ops);
  return { attempt, logs, states, duplicate: false };
}

// ----------------------------------------------------------------- reviews

export interface DueGroup {
  chunk: ChunkRecord;
  document: ReadingDocument;
  ideas: KeyIdeaSnapshot[];
  states: MemoryState[];
  /** Earliest authoritative due date among the ideas. */
  dueAt: string;
}

/** Due reviews grouped by chunk, most overdue first (retrieval-first order). */
export async function dueReviewGroups(store: RecallStore, now: Date): Promise<DueGroup[]> {
  const [states, chunks, docs] = await Promise.all([
    store.getAll('memory'),
    store.getAll('chunks'),
    store.getAll('documents'),
  ]);
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const docById = new Map(docs.map((d) => [d.id, d]));
  const groups = new Map<string, DueGroup>();
  for (const st of states) {
    if (st.isProbe || !isDue(st, now)) continue;
    const chunk = chunkById.get(st.chunkId);
    const document = docById.get(st.documentId);
    const idea = chunk?.ideas.find((i) => i.id === st.id);
    if (!chunk || !document || !idea) continue;
    const g = groups.get(chunk.id) ?? {
      chunk,
      document,
      ideas: [],
      states: [],
      dueAt: st.authoritativeNextAt,
    };
    g.ideas.push(idea);
    g.states.push(st);
    if (st.authoritativeNextAt < g.dueAt) g.dueAt = st.authoritativeNextAt;
    groups.set(chunk.id, g);
  }
  for (const g of groups.values()) {
    const order = new Map(g.chunk.ideas.map((i, k) => [i.id, k]));
    g.ideas.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  return [...groups.values()].sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.chunk.index - b.chunk.index,
  );
}

/** Earliest upcoming authoritative review (for "Next review: tomorrow"). */
export async function nextReviewAt(store: RecallStore, now: Date): Promise<string | null> {
  const states = (await store.getAll('memory')).filter((s) => !s.isProbe && !isDue(s, now));
  return states.map((s) => s.authoritativeNextAt).sort()[0] ?? null;
}

// ---------------------------------------------------------------- deletion

/** Delete one reading and everything derived from it (chunks, points, attempts, review history). */
export async function deleteDocument(store: RecallStore, documentId: string): Promise<void> {
  const snap = await readSnapshot(store);
  const chunkIds = new Set(snap.chunks.filter((c) => c.documentId === documentId).map((c) => c.id));
  const attemptIds = new Set(
    snap.attempts.filter((a) => a.documentId === documentId).map((a) => a.id),
  );
  const ops: StoreOp[] = [deleteOp('documents', documentId)];
  for (const id of chunkIds) ops.push(deleteOp('chunks', id));
  for (const m of snap.memory) if (m.documentId === documentId) ops.push(deleteOp('memory', m.id));
  for (const id of attemptIds) ops.push(deleteOp('attempts', id));
  for (const l of snap.reviewLog)
    if (attemptIds.has(l.attemptId)) ops.push(deleteOp('reviewLog', l.id));
  for (const s of snap.strategy)
    if (s.chunkId && chunkIds.has(s.chunkId)) ops.push(deleteOp('strategy', s.id));
  for (const s of snap.sessions) {
    const keep = s.attemptIds.filter((id) => !attemptIds.has(id));
    const draftHit = s.draft?.documentId === documentId;
    if (keep.length !== s.attemptIds.length || draftHit) {
      ops.push(putOp('sessions', { ...s, attemptIds: keep, draft: draftHit ? null : s.draft }));
    }
  }
  await store.batch(ops);
}

export async function deleteAllData(store: RecallStore): Promise<void> {
  await store.clearAll();
}

/** The next bundled passage to offer: an unfinished one first, then the first never started. */
export function suggestNextPassage(
  passages: AuthoredPassage[],
  documents: ReadingDocument[],
): AuthoredPassage | null {
  const lib = passages.filter((p) => p.kind === 'library');
  // Any opened-but-unfinished reading is continued before a new one is offered.
  const inProgress = documents
    .filter((d) => d.provenance === 'sample' && d.status !== 'finished')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  if (inProgress) {
    const p = lib.find((x) => x.id === inProgress.passageId);
    if (p) return p;
  }
  const started = new Set(documents.map((d) => d.passageId));
  return lib.find((p) => !started.has(p.id)) ?? lib[0] ?? null;
}

/** The next fresh-text probe never attempted before (null when all have been used). */
export function suggestNextProbe(
  passages: AuthoredPassage[],
  documents: ReadingDocument[],
): AuthoredPassage | null {
  const probes = documents.filter((d) => d.provenance === 'probe');
  const unfinished = probes
    .filter((d) => d.status !== 'finished')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  if (unfinished) {
    const p = passages.find((x) => x.id === unfinished.passageId);
    if (p) return p;
  }
  const finished = new Set(probes.filter((d) => d.status === 'finished').map((d) => d.passageId));
  return passages.find((p) => p.kind === 'probe' && !finished.has(p.id)) ?? null;
}
