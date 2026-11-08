/**
 * SQLite-backed store used by the native iOS app (expo-sqlite) and tested in
 * Node with `node:sqlite`. The driver interface matches the subset of the
 * expo-sqlite async API that we use, so the same migrations run on device and
 * in tests.
 */
import type { CollectionName, RecordMap, Snapshot } from './types';
import { COLLECTIONS } from './types';
import type { RecallStore, StoreOp } from './store';

export type SqlParam = string | number | null;

export interface SqlDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlParam[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export interface SqliteMigration {
  version: number;
  description: string;
  statements: string[];
}

/** Ordered, append-only list. Never edit a released migration; add a new one. */
export const SQLITE_MIGRATIONS: readonly SqliteMigration[] = [
  {
    version: 1,
    description: 'Create records and meta tables',
    statements: [
      `CREATE TABLE IF NOT EXISTS records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (collection, id)
      )`,
      `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`,
    ],
  },
  {
    version: 2,
    description: 'Index records by collection for faster due-review queries',
    statements: [
      'CREATE INDEX IF NOT EXISTS idx_records_collection ON records (collection, updated_at)',
    ],
  },
];

export const SQLITE_SCHEMA_VERSION = SQLITE_MIGRATIONS[SQLITE_MIGRATIONS.length - 1]?.version ?? 0;

export async function getUserVersion(db: SqlDriver): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

/** Bring the database up to the latest schema. Each migration runs in its own transaction. */
export async function migrateSqlite(db: SqlDriver, upTo = SQLITE_SCHEMA_VERSION): Promise<number> {
  let current = await getUserVersion(db);
  if (current > SQLITE_SCHEMA_VERSION) {
    throw new Error(
      `This data was saved by a newer version of Recall (schema ${current}). Please update the app before opening it.`,
    );
  }
  for (const m of SQLITE_MIGRATIONS) {
    if (m.version <= current || m.version > upTo) continue;
    await db.withTransactionAsync(async () => {
      for (const s of m.statements) await db.execAsync(s);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}

export class SqliteStore implements RecallStore {
  private constructor(private readonly db: SqlDriver) {}

  static async open(db: SqlDriver): Promise<SqliteStore> {
    await migrateSqlite(db);
    return new SqliteStore(db);
  }

  async get<C extends CollectionName>(c: C, id: string): Promise<RecordMap[C] | undefined> {
    const row = await this.db.getFirstAsync<{ json: string }>(
      'SELECT json FROM records WHERE collection = ? AND id = ?',
      [c, id],
    );
    return row ? (JSON.parse(row.json) as RecordMap[C]) : undefined;
  }

  async getAll<C extends CollectionName>(c: C): Promise<RecordMap[C][]> {
    const rows = await this.db.getAllAsync<{ json: string }>(
      'SELECT json FROM records WHERE collection = ? ORDER BY updated_at, id',
      [c],
    );
    return rows.map((r) => JSON.parse(r.json) as RecordMap[C]);
  }

  async batch(ops: StoreOp[]): Promise<void> {
    if (ops.length === 0) return;
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      for (const op of ops) {
        if (op.type === 'put') {
          await this.db.runAsync(
            'INSERT INTO records (collection, id, json, updated_at) VALUES (?, ?, ?, ?) ' +
              'ON CONFLICT(collection, id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at',
            [op.collection, op.value.id, JSON.stringify(op.value), now],
          );
        } else {
          await this.db.runAsync('DELETE FROM records WHERE collection = ? AND id = ?', [
            op.collection,
            op.id,
          ]);
        }
      }
    });
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM records', []);
      for (const c of COLLECTIONS) {
        for (const r of (snapshot[c] ?? []) as { id: string }[]) {
          await this.db.runAsync(
            'INSERT INTO records (collection, id, json, updated_at) VALUES (?, ?, ?, ?)',
            [c, r.id, JSON.stringify(r), now],
          );
        }
      }
    });
  }

  async clearAll(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM records', []);
    });
  }
}
