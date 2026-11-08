import { openDB, type IDBPDatabase } from 'idb';
import {
  COLLECTIONS,
  type CollectionName,
  type RecallStore,
  type RecordMap,
  type Snapshot,
  type StoreOp,
} from '@recall/core';

export const IDB_NAME = 'recall';
/** IndexedDB schema version. v1: one object store per collection, keyed by `id`. */
export const IDB_VERSION = 1;

export class StorageWriteError extends Error {
  constructor(
    public readonly reason: 'quota' | 'other',
    message: string,
  ) {
    super(message);
  }
}

function classify(e: unknown): StorageWriteError {
  const name = (e as { name?: string })?.name ?? '';
  if (name === 'QuotaExceededError' || /quota/i.test(String((e as Error)?.message))) {
    return new StorageWriteError(
      'quota',
      'Your device is out of space for Recall. Please export a backup and free some space.',
    );
  }
  return new StorageWriteError(
    'other',
    'Recall could not save just now. Your last step may need repeating.',
  );
}

export class IdbStore implements RecallStore {
  private constructor(private readonly db: IDBPDatabase) {}

  static async open(name = IDB_NAME): Promise<IdbStore> {
    const db = await openDB(name, IDB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          for (const c of COLLECTIONS) {
            if (!database.objectStoreNames.contains(c))
              database.createObjectStore(c, { keyPath: 'id' });
          }
        }
      },
      blocking() {
        // Another tab is upgrading: close so it can proceed.
        db.close();
      },
    });
    return new IdbStore(db);
  }

  async get<C extends CollectionName>(c: C, id: string): Promise<RecordMap[C] | undefined> {
    return (await this.db.get(c, id)) as RecordMap[C] | undefined;
  }

  async getAll<C extends CollectionName>(c: C): Promise<RecordMap[C][]> {
    return (await this.db.getAll(c)) as RecordMap[C][];
  }

  async batch(ops: StoreOp[]): Promise<void> {
    if (ops.length === 0) return;
    const names = [...new Set(ops.map((o) => o.collection))];
    try {
      const tx = this.db.transaction(names, 'readwrite');
      for (const op of ops) {
        const s = tx.objectStore(op.collection);
        if (op.type === 'put') void s.put(op.value);
        else void s.delete(op.id);
      }
      await tx.done;
    } catch (e) {
      throw classify(e);
    }
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    try {
      const tx = this.db.transaction([...COLLECTIONS], 'readwrite');
      for (const c of COLLECTIONS) {
        const s = tx.objectStore(c);
        void s.clear();
        for (const r of snapshot[c] ?? []) void s.put(r);
      }
      await tx.done;
    } catch (e) {
      throw classify(e);
    }
  }

  async clearAll(): Promise<void> {
    const tx = this.db.transaction([...COLLECTIONS], 'readwrite');
    for (const c of COLLECTIONS) void tx.objectStore(c).clear();
    await tx.done;
  }

  close() {
    this.db.close();
  }
}
