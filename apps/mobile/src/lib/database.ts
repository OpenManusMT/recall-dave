/**
 * Opens Recall's on-device database (expo-sqlite, file "recall.db" inside the
 * app's private storage) and wraps it in the shared SqliteStore, which runs
 * the same migrations that are tested in packages/core.
 */
import * as SQLite from 'expo-sqlite';
import { SqliteStore } from '@recall/core';
import { createSqlDriver, DATABASE_NAME } from './sqlite-driver';

export async function openRecallStore(): Promise<SqliteStore> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // Write-ahead logging: safer and faster for many small writes (drafts).
  await db.execAsync('PRAGMA journal_mode = WAL');
  return SqliteStore.open(createSqlDriver(db));
}
