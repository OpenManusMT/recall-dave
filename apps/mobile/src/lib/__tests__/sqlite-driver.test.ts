/// <reference types="node" />
/**
 * Tests for the expo-sqlite → SqlDriver adapter.
 *
 * The fake database below has the same shape and transaction behaviour as
 * expo-sqlite's SQLiteDatabase (BEGIN / task / COMMIT, ROLLBACK on error, and
 * NOT exclusive), backed by Node's built-in SQLite so the real SQL from
 * @recall/core runs. Every call yields first, like a native bridge call, so
 * concurrent work really interleaves.
 */
import { describe, expect, it } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';
import {
  getUserVersion,
  logStrategy,
  openPassage,
  putOp,
  recordAttempt,
  saveDraft,
  SQLITE_SCHEMA_VERSION,
  SqliteStore,
  startSession,
  getSettings,
  type SqlParam,
} from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';
import { createSqlDriver, DATABASE_NAME, type ExpoLikeDatabase } from '../sqlite-driver';

const yieldOnce = () => new Promise<void>((resolve) => resolve());

function fakeExpoDatabase(db = new DatabaseSync(':memory:')) {
  const log: string[] = [];
  const fake: ExpoLikeDatabase = {
    async execAsync(sql: string) {
      await yieldOnce();
      log.push(sql.trim().split(/\s+/)[0] ?? '');
      db.exec(sql);
    },
    async runAsync(sql: string, params: SqlParam[]) {
      await yieldOnce();
      return db.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, params: SqlParam[]) {
      await yieldOnce();
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[]) {
      await yieldOnce();
      return (db.prepare(sql).get(...params) ?? null) as T | null;
    },
    // Same algorithm as expo-sqlite's withTransactionAsync (not exclusive).
    async withTransactionAsync(task: () => Promise<void>) {
      await fake.execAsync('BEGIN');
      try {
        await task();
        await fake.execAsync('COMMIT');
      } catch (e) {
        await fake.execAsync('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, fake, log };
}

describe('createSqlDriver', () => {
  it('uses the agreed database file name', () => {
    expect(DATABASE_NAME).toBe('recall.db');
  });

  it('passes SQL and parameters through unchanged', async () => {
    const calls: [string, string, SqlParam[]][] = [];
    const record = (kind: string) => async (sql: string, params: SqlParam[]) => {
      calls.push([kind, sql, params]);
      return kind === 'all' ? [] : null;
    };
    const driver = createSqlDriver({
      execAsync: async () => undefined,
      runAsync: record('run'),
      getAllAsync: record('all') as ExpoLikeDatabase['getAllAsync'],
      getFirstAsync: record('first') as ExpoLikeDatabase['getFirstAsync'],
      withTransactionAsync: async (task) => task(),
    });
    await driver.runAsync('INSERT INTO t VALUES (?, ?)', ['a', 1]);
    await driver.getAllAsync('SELECT * FROM t WHERE x = ?', [null]);
    await driver.getFirstAsync('SELECT 1', []);
    expect(calls).toEqual([
      ['run', 'INSERT INTO t VALUES (?, ?)', ['a', 1]],
      ['all', 'SELECT * FROM t WHERE x = ?', [null]],
      ['first', 'SELECT 1', []],
    ]);
  });

  it('shows why the adapter exists: two overlapping expo-sqlite transactions collide', async () => {
    const { fake } = fakeExpoDatabase();
    await fake.execAsync('CREATE TABLE t (v TEXT)');
    const write = (v: string) =>
      fake.withTransactionAsync(async () => {
        await fake.runAsync('INSERT INTO t VALUES (?)', [v]);
      });
    const results = await Promise.allSettled([write('a'), write('b')]);
    expect(results.some((r) => r.status === 'rejected')).toBe(true);
  });

  it('runs overlapping transactions one after another, so both succeed', async () => {
    const { db, fake, log } = fakeExpoDatabase();
    const driver = createSqlDriver(fake);
    await driver.execAsync('CREATE TABLE t (v TEXT)');
    const write = (v: string) =>
      driver.withTransactionAsync(async () => {
        await driver.runAsync('INSERT INTO t VALUES (?)', [v]);
        await driver.runAsync('INSERT INTO t VALUES (?)', [`${v}2`]);
      });
    await Promise.all([write('a'), write('b'), write('c')]);
    expect(db.prepare('SELECT v FROM t ORDER BY rowid').all().map((r) => (r as { v: string }).v)).toEqual([
      'a',
      'a2',
      'b',
      'b2',
      'c',
      'c2',
    ]);
    expect(log.filter((s) => s !== 'CREATE')).toEqual(['BEGIN', 'COMMIT', 'BEGIN', 'COMMIT', 'BEGIN', 'COMMIT']);
  });

  it('rolls back a failed transaction, reports it, and keeps the queue moving', async () => {
    const { db, fake } = fakeExpoDatabase();
    const driver = createSqlDriver(fake);
    await driver.execAsync('CREATE TABLE t (v TEXT)');
    const failing = driver.withTransactionAsync(async () => {
      await driver.runAsync('INSERT INTO t VALUES (?)', ['lost']);
      throw new Error('interrupted');
    });
    const next = driver.withTransactionAsync(async () => {
      await driver.runAsync('INSERT INTO t VALUES (?)', ['kept']);
    });
    await expect(failing).rejects.toThrow('interrupted');
    await expect(next).resolves.toBeUndefined();
    expect(db.prepare('SELECT v FROM t').all()).toEqual([{ v: 'kept' }]);
  });
});

describe('SqliteStore from @recall/core over the adapter', () => {
  it('migrates a new database to the current schema', async () => {
    const { fake } = fakeExpoDatabase();
    const driver = createSqlDriver(fake);
    await SqliteStore.open(driver);
    expect(await getUserVersion(driver)).toBe(SQLITE_SCHEMA_VERSION);
    // Opening again is a no-op.
    await SqliteStore.open(driver);
    expect(await getUserVersion(driver)).toBe(SQLITE_SCHEMA_VERSION);
  });

  it('runs a reading flow: concurrent draft/strategy writes, then an idempotent attempt', async () => {
    const { fake } = fakeExpoDatabase();
    const store = await SqliteStore.open(createSqlDriver(fake));
    const now = new Date('2026-11-08T10:00:00Z');
    const settings = await getSettings(store);
    const passage = LIBRARY_PASSAGES[0];
    if (!passage) throw new Error('no passages');
    const { document, chunks } = await openPassage(store, passage, settings, now);
    const chunk = chunks[0];
    if (!chunk) throw new Error('no chunks');
    const { session } = await startSession(store, 'remember', now);

    // A draft save and a strategy log at the same moment (as happens on device).
    await Promise.all([
      saveDraft(store, session.id, { documentId: document.id, chunkId: chunk.id, phase: 'recall', recallText: 'bread', kind: 'learn' }, now),
      logStrategy(store, session.id, 'read_aloud', chunk.id, now),
      store.batch([putOp('settings', { ...settings, fontScale: 1.3 })]),
    ]);
    expect((await store.get('sessions', session.id))?.draft?.recallText).toBe('bread');

    const input = {
      attemptId: 'att_test_1',
      sessionId: session.id,
      documentId: document.id,
      chunkId: chunk.id,
      kind: 'learn' as const,
      startedAt: now.toISOString(),
      recallText: 'bread',
      textPeeks: 0,
      ideas: chunk.ideas.map((i) => ({ ideaId: i.id, outcome: 'correct' as const, clueLevel: 0 as const })),
      question: null,
      tooMuch: false,
    };
    const [first, second] = await Promise.all([recordAttempt(store, input, now), recordAttempt(store, input, now)]);
    const third = await recordAttempt(store, input, now);
    expect([first.duplicate, second.duplicate].filter(Boolean).length).toBeLessThanOrEqual(1);
    expect(third.duplicate).toBe(true);
    expect((await store.getAll('attempts')).length).toBe(1);
    expect((await store.getAll('memory')).length).toBe(chunk.ideas.length);
    expect((await store.get('sessions', session.id))?.draft).toBeNull();
  });
});
