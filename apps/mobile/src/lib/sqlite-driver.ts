/**
 * Adapter from expo-sqlite's async database API to the `SqlDriver` interface
 * used by `SqliteStore` in @recall/core.
 *
 * Why an adapter at all? expo-sqlite's `withTransactionAsync` is not
 * exclusive: if two parts of the app write at the same moment (for example a
 * draft being saved while a finished part is recorded), the second `BEGIN`
 * would fail with "cannot start a transaction within a transaction". This
 * adapter queues transactions so they run strictly one after another. A
 * failed transaction is rolled back by expo-sqlite, reported to its caller,
 * and does not block the queue.
 *
 * Statements outside a transaction (reads) are passed straight through.
 * @recall/core never opens a transaction from inside another one, so the
 * queue cannot deadlock.
 *
 * This file must not import expo-sqlite itself, so it can be unit tested in
 * Node with a fake database.
 */
import type { SqlDriver, SqlParam } from '@recall/core';

/** The subset of expo-sqlite's `SQLiteDatabase` that Recall uses. */
export interface ExpoLikeDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParam[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const DATABASE_NAME = 'recall.db';

export function createSqlDriver(db: ExpoLikeDatabase): SqlDriver {
  let queue: Promise<void> = Promise.resolve();
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params) => db.runAsync(sql, [...params]),
    getAllAsync: <T>(sql: string, params: SqlParam[]) => db.getAllAsync<T>(sql, [...params]),
    getFirstAsync: <T>(sql: string, params: SqlParam[]) => db.getFirstAsync<T>(sql, [...params]),
    withTransactionAsync(task) {
      const run = queue.then(() => db.withTransactionAsync(task));
      // Keep the queue going even if this transaction fails; the caller still sees the error.
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
