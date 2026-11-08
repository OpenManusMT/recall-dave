import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createPastedDocument,
  deleteAllData,
  deleteDocument,
  dueReviewGroups,
  finishSession,
  getActiveSession,
  getDocumentChunks,
  getSettings,
  getUserVersion,
  MemoryStore,
  migrateSqlite,
  newId,
  nextReviewAt,
  openPassage,
  readSnapshot,
  recordAttempt,
  replanFrom,
  saveDraft,
  saveSettings,
  SQLITE_SCHEMA_VERSION,
  SqliteStore,
  startSession,
  suggestNextPassage,
  suggestNextProbe,
  validatePastedReading,
  type AttemptInput,
  type ChunkRecord,
  type RecallStore,
} from '../src';
import { TEST_PASSAGE } from './helpers/fixtures';
import { nodeSqliteDriver, openMemoryDb } from './helpers/node-sqlite';

const T0 = new Date('2026-11-08T10:00:00');
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function learnInput(sessionId: string, chunk: ChunkRecord, over: Partial<AttemptInput> = {}): AttemptInput {
  return {
    attemptId: newId('att'),
    sessionId,
    documentId: chunk.documentId,
    chunkId: chunk.id,
    kind: 'learn',
    startedAt: T0.toISOString(),
    recallText: 'Private words: limescale builds up and an acid removes it.',
    textPeeks: 0,
    ideas: chunk.ideas.map((i, k) => ({ ideaId: i.id, outcome: k === 0 ? 'correct' : 'partial', clueLevel: k === 0 ? 0 : 2 })),
    question: chunk.questions[0] ? { questionId: chunk.questions[0].id, chosenIndex: chunk.questions[0].answerIndex, correct: true } : null,
    tooMuch: false,
    ...over,
  };
}

const factories: [string, () => Promise<RecallStore>][] = [
  ['MemoryStore', async () => new MemoryStore()],
  ['SqliteStore (node:sqlite, same migrations as iOS)', async () => SqliteStore.open(nodeSqliteDriver(openMemoryDb()))],
];

describe.each(factories)('repository on %s', (_name, make) => {
  let store: RecallStore;
  beforeEach(async () => {
    store = await make();
  });

  it('settings default safely and clamp out-of-range values', async () => {
    const s = await getSettings(store);
    expect(s.schedulerMode).toBe('shadow');
    expect(s.experimentalScorer).toBe(false);
    const saved = await saveSettings(store, { ...s, fontScale: 99, adaptiveChunkWords: 5 });
    expect(saved.fontScale).toBeLessThanOrEqual(2);
    expect(saved.adaptiveChunkWords).toBe(saved.minChunkWords);
  });

  it('runs the core journey: read → recall → check → save → due next day → review', async () => {
    const { session } = await startSession(store, 'remember', T0);
    const settings = await getSettings(store);
    const { document, chunks } = await openPassage(store, TEST_PASSAGE, settings, T0);
    expect(chunks.length).toBeGreaterThan(1);
    const first = chunks[0] as ChunkRecord;
    const out = await recordAttempt(store, learnInput(session.id, first), T0);
    expect(out.attempt.firstExposure).toBe(true);
    expect(out.states).toHaveLength(first.ideas.length);
    expect(await dueReviewGroups(store, T0)).toHaveLength(0);
    expect(await nextReviewAt(store, T0)).not.toBeNull();

    const tomorrow = plusDays(T0, 1);
    const due = await dueReviewGroups(store, tomorrow);
    expect(due).toHaveLength(1);
    expect(due[0]?.ideas.map((i) => i.id)).toEqual(first.ideas.map((i) => i.id));

    const rev = await recordAttempt(
      store,
      { ...learnInput(session.id, first), kind: 'review', ideas: first.ideas.map((i) => ({ ideaId: i.id, outcome: 'correct', clueLevel: 0 })) },
      tomorrow,
    );
    expect(rev.attempt.elapsedDays).toBeCloseTo(1, 3);
    expect(rev.logs.every((l) => l.authoritativeDueBefore !== null && l.recommendedBefore !== null)).toBe(true);
    expect(await dueReviewGroups(store, tomorrow)).toHaveLength(0);
    const doc = await store.get('documents', document.id);
    expect(doc?.nextChunkIndex).toBe(1);
  });

  it('is idempotent for duplicate taps (same attempt id)', async () => {
    const { session } = await startSession(store, 'remember', T0);
    const { chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    const input = learnInput(session.id, chunks[0] as ChunkRecord);
    await recordAttempt(store, input, T0);
    const again = await recordAttempt(store, input, T0);
    expect(again.duplicate).toBe(true);
    const snap = await readSnapshot(store);
    expect(snap.attempts).toHaveLength(1);
    expect(snap.reviewLog).toHaveLength((chunks[0] as ChunkRecord).ideas.length);
  });

  it('rejects ideas that do not belong to the chunk', async () => {
    const { session } = await startSession(store, 'remember', T0);
    const { chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    await expect(
      recordAttempt(store, learnInput(session.id, chunks[0] as ChunkRecord, { ideas: [{ ideaId: 'nope', outcome: 'correct', clueLevel: 0 }] }), T0),
    ).rejects.toThrow();
  });

  it('reopens the same unfinished document instead of duplicating it', async () => {
    const s = await getSettings(store);
    const a = await openPassage(store, TEST_PASSAGE, s, T0);
    const b = await openPassage(store, TEST_PASSAGE, s, T0);
    expect(b.document.id).toBe(a.document.id);
  });

  it('“Too much text” re-plans the unread part with shorter chunks and keeps read chunks', async () => {
    const s = await getSettings(store);
    const { document, chunks } = await openPassage(store, TEST_PASSAGE, s, T0);
    const replanned = await replanFrom(store, document.id, 1, 30, { ...s, minChunkWords: 20 }, TEST_PASSAGE, T0);
    expect(replanned[0]?.id).toBe(chunks[0]?.id);
    expect(replanned.length).toBeGreaterThanOrEqual(chunks.length);
    const ideaIds = replanned.flatMap((c) => c.ideas.map((i) => i.id));
    expect(new Set(ideaIds).size).toBe(ideaIds.length);
    expect(new Set(ideaIds).size).toBe(5);
    const doc = await store.get('documents', document.id);
    expect(doc?.chunkCount).toBe(replanned.length);
  });

  it('stores pasted reading as untrusted plain text and plans grounded points', async () => {
    const s = await getSettings(store);
    const text =
      'The library opens at nine on weekdays. It closes early on Wednesdays because of staff training.\n\nBooks can usually be renewed online, unless someone else has reserved them. Fines are not charged for children’s books.';
    const { document, chunks } = await createPastedDocument(store, { title: '', text }, s, T0);
    expect(document.provenance).toBe('pasted');
    expect(document.title.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const c of chunks) for (const i of c.ideas) expect(c.text).toContain(i.text);
    expect(validatePastedReading('', '').ok).toBe(false);
    expect(validatePastedReading('', 'x'.repeat(20_001)).ok).toBe(false);
    expect(validatePastedReading('', 'Too short.').ok).toBe(false);
  });

  it('saves and resumes a draft after a restart, and closes stale sessions', async () => {
    const { session } = await startSession(store, 'remember', T0);
    const { document, chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    await saveDraft(store, session.id, { documentId: document.id, chunkId: chunks[0]!.id, phase: 'recall', recallText: 'half typed', kind: 'learn' }, T0);
    const active = await getActiveSession(store);
    expect(active?.draft?.recallText).toBe('half typed');
    const { session: s2 } = await startSession(store, 'remember', plusDays(T0, 1));
    const sessions = await store.getAll('sessions');
    expect(sessions.filter((s) => s.status === 'active').map((s) => s.id)).toEqual([s2.id]);
    await finishSession(store, s2.id, plusDays(T0, 1));
    expect(await getActiveSession(store)).toBeUndefined();
  });

  it('deleting a reading removes its text, points, attempts and history', async () => {
    const { session } = await startSession(store, 'remember', T0);
    const { document, chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    await recordAttempt(store, learnInput(session.id, chunks[0] as ChunkRecord), T0);
    await deleteDocument(store, document.id);
    const snap = await readSnapshot(store);
    expect(snap.documents).toHaveLength(0);
    expect(snap.chunks).toHaveLength(0);
    expect(snap.memory).toHaveLength(0);
    expect(snap.attempts).toHaveLength(0);
    expect(snap.reviewLog).toHaveLength(0);
    expect(JSON.stringify(snap)).not.toContain('Private words');
  });

  it('delete all data leaves nothing behind', async () => {
    const { session } = await startSession(store, 'remember', T0);
    const { chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    await recordAttempt(store, learnInput(session.id, chunks[0] as ChunkRecord), T0);
    await deleteAllData(store);
    const snap = await readSnapshot(store);
    for (const rows of Object.values(snap)) expect(rows).toHaveLength(0);
  });
});

describe('persistence across restart (file-backed SQLite)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'recall-sqlite-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('progress saved before closing is there after reopening', async () => {
    const path = join(dir, 'recall.db');
    const db1 = openMemoryDb(path);
    const store1 = await SqliteStore.open(nodeSqliteDriver(db1));
    const { session } = await startSession(store1, 'remember', T0);
    const { chunks } = await openPassage(store1, TEST_PASSAGE, await getSettings(store1), T0);
    await recordAttempt(store1, learnInput(session.id, chunks[0] as ChunkRecord), T0);
    db1.close();

    const db2 = openMemoryDb(path);
    const store2 = await SqliteStore.open(nodeSqliteDriver(db2));
    expect(await dueReviewGroups(store2, plusDays(T0, 1))).toHaveLength(1);
    expect(await getUserVersion(nodeSqliteDriver(db2))).toBe(SQLITE_SCHEMA_VERSION);
    db2.close();
  });
});

describe('SQLite migrations', () => {
  it('migrates a fresh database to the latest schema', async () => {
    const d = nodeSqliteDriver(openMemoryDb());
    expect(await migrateSqlite(d)).toBe(SQLITE_SCHEMA_VERSION);
    expect(SQLITE_SCHEMA_VERSION).toBe(2);
  });

  it('upgrades a version-1 database without losing records', async () => {
    const db = openMemoryDb();
    const d = nodeSqliteDriver(db);
    await migrateSqlite(d, 1);
    expect(await getUserVersion(d)).toBe(1);
    db.prepare('INSERT INTO records (collection, id, json, updated_at) VALUES (?, ?, ?, ?)').run(
      'settings',
      'settings',
      JSON.stringify({ id: 'settings', fontScale: 1.5 }),
      T0.toISOString(),
    );
    const store = await SqliteStore.open(d);
    expect(await getUserVersion(d)).toBe(2);
    expect((await getSettings(store)).fontScale).toBe(1.5);
    const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_records_collection'").get();
    expect(idx).toBeTruthy();
  });

  it('refuses to open data written by a newer schema', async () => {
    const d = nodeSqliteDriver(openMemoryDb());
    await d.execAsync('PRAGMA user_version = 99');
    await expect(migrateSqlite(d)).rejects.toThrow(/newer version/);
  });

  it('rolls back an interrupted batch completely', async () => {
    const db = openMemoryDb();
    const store = await SqliteStore.open(nodeSqliteDriver(db));
    await expect(
      store.batch([
        { type: 'put', collection: 'strategy', value: { id: 'a' } },
        // Invalid collection name violates nothing in SQL, so force a failure with a bad statement instead:
        { type: 'put', collection: 'strategy', value: { id: undefined as unknown as string } },
      ]),
    ).rejects.toThrow();
    expect(await store.getAll('strategy')).toHaveLength(0);
  });
});

describe('MemoryStore interrupted write', () => {
  it('applies nothing when a batch fails part-way', async () => {
    const store = new MemoryStore();
    const { session } = await startSession(store, 'remember', T0);
    const { chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    store.failNextBatchAfter = 2;
    await expect(recordAttempt(store, learnInput(session.id, chunks[0] as ChunkRecord), T0)).rejects.toThrow();
    const snap = await readSnapshot(store);
    expect(snap.attempts).toHaveLength(0);
    expect(snap.memory).toHaveLength(0);
    expect(snap.reviewLog).toHaveLength(0);
  });
});

describe('suggestions', () => {
  it('offers an in-progress passage first, then a new one; probes are separate', () => {
    const lib = [TEST_PASSAGE, { ...TEST_PASSAGE, id: 'p98-other', title: 'Other' }];
    const probe = { ...TEST_PASSAGE, id: 'probe-01-x', title: 'Probe', kind: 'probe' as const, sections: [TEST_PASSAGE.sections[0]!] };
    expect(suggestNextPassage([...lib, probe], [])?.id).toBe('p99-test-kettles');
    const doc = { id: 'd', title: '', text: '', createdAt: T0.toISOString(), updatedAt: T0.toISOString(), provenance: 'sample' as const, passageId: 'p99-test-kettles', status: 'finished' as const, nextChunkIndex: 3, chunkCount: 3 };
    expect(suggestNextPassage([...lib, probe], [doc])?.id).toBe('p98-other');
    expect(suggestNextProbe([...lib, probe], [doc])?.id).toBe('probe-01-x');
  });
});

describe('privacy: no learner text in logs', () => {
  it('the core journey writes nothing to the console', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    const store = new MemoryStore();
    const { session } = await startSession(store, 'remember', T0);
    const { chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
    await recordAttempt(store, learnInput(session.id, chunks[0] as ChunkRecord), T0);
    await dueReviewGroups(store, plusDays(T0, 1));
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
