// IndexedDB store tests (fake-indexeddb). Regression tests from improvement pass 2.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  dueReviewGroups,
  getSettings,
  newId,
  openPassage,
  readSnapshot,
  recordAttempt,
  startSession,
} from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';
import { IdbStore, StorageWriteError } from './idb-store';

const T0 = new Date('2026-11-09T10:00:00Z');

describe('IdbStore', () => {
  it('runs the core journey and keeps it after the database is closed and reopened', async () => {
    const name = `t-${Math.random()}`;
    const s1 = await IdbStore.open(name);
    const { session } = await startSession(s1, 'remember', T0);
    const { chunks } = await openPassage(s1, LIBRARY_PASSAGES[0]!, await getSettings(s1), T0);
    const c = chunks[0]!;
    await recordAttempt(
      s1,
      {
        attemptId: newId('att'),
        sessionId: session.id,
        documentId: c.documentId,
        chunkId: c.id,
        kind: 'learn',
        startedAt: T0.toISOString(),
        recallText: 'words',
        textPeeks: 0,
        ideas: c.ideas.map((i) => ({ ideaId: i.id, outcome: 'correct', clueLevel: 0 })),
        question: null,
        tooMuch: false,
      },
      T0,
    );
    s1.close();
    const s2 = await IdbStore.open(name);
    expect(await dueReviewGroups(s2, new Date(T0.getTime() + 86_400_000))).toHaveLength(1);
    s2.close();
  });

  it('applies a batch atomically: one bad operation means nothing is written', async () => {
    const store = await IdbStore.open(`t-${Math.random()}`);
    await expect(
      store.batch([
        { type: 'put', collection: 'strategy', value: { id: 'ok' } },
        { type: 'put', collection: 'strategy', value: {} as { id: string } }, // no key → DataError
      ]),
    ).rejects.toBeInstanceOf(StorageWriteError);
    expect(await store.getAll('strategy')).toEqual([]);
  });

  it('reports a full device as a clear, specific message', async () => {
    const store = await IdbStore.open(`t-${Math.random()}`);
    const db = (store as unknown as { db: { transaction: (...a: unknown[]) => unknown } }).db;
    db.transaction = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    const err = await store
      .batch([{ type: 'put', collection: 'strategy', value: { id: 'x' } }])
      .catch((e) => e);
    expect(err).toBeInstanceOf(StorageWriteError);
    expect((err as StorageWriteError).reason).toBe('quota');
    expect((err as Error).message).toMatch(/out of space/);
  });

  it('replaceAll swaps the whole dataset in one step', async () => {
    const store = await IdbStore.open(`t-${Math.random()}`);
    await store.batch([{ type: 'put', collection: 'strategy', value: { id: 'old' } }]);
    const snap = await readSnapshot(store);
    snap.strategy = [
      { id: 'new', sessionId: 's', at: T0.toISOString(), strategy: 'reread', chunkId: null },
    ];
    await store.replaceAll(snap);
    expect((await store.getAll('strategy')).map((s) => s.id)).toEqual(['new']);
    await store.clearAll();
    expect(await store.getAll('strategy')).toEqual([]);
  });
});
