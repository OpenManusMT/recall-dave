import { DatabaseSync } from 'node:sqlite';
import type { SqlDriver, SqlParam } from '../../src';

/** Adapts Node's built-in SQLite to the expo-sqlite-shaped driver used on iOS. */
export function nodeSqliteDriver(db: DatabaseSync): SqlDriver {
  let depth = 0;
  return {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: SqlParam[]) {
      return db.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, params: SqlParam[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[]) {
      return (db.prepare(sql).get(...params) ?? null) as T | null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      if (depth > 0) return task();
      depth++;
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
  };
}

export function openMemoryDb(path = ':memory:') {
  return new DatabaseSync(path);
}
