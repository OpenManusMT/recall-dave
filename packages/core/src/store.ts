import type { CollectionName, RecordMap, Snapshot } from './types';
import { COLLECTIONS } from './types';

export type StoreOp =
  | { type: 'put'; collection: CollectionName; value: { id: string } }
  | { type: 'delete'; collection: CollectionName; id: string };

/**
 * Local persistence used by both apps (IndexedDB on the web, SQLite on iOS).
 * `batch` must be atomic: either every operation is stored or none is, so an
 * interrupted write can never leave half a session behind.
 */
export interface RecallStore {
  get<C extends CollectionName>(c: C, id: string): Promise<RecordMap[C] | undefined>;
  getAll<C extends CollectionName>(c: C): Promise<RecordMap[C][]>;
  batch(ops: StoreOp[]): Promise<void>;
  /** Atomically replace all data (backup import). */
  replaceAll(snapshot: Snapshot): Promise<void>;
  clearAll(): Promise<void>;
}

export const putOp = <C extends CollectionName>(collection: C, value: RecordMap[C]): StoreOp => ({
  type: 'put',
  collection,
  value: value as { id: string },
});

export const deleteOp = (collection: CollectionName, id: string): StoreOp => ({ type: 'delete', collection, id });

export function emptySnapshot(): Snapshot {
  return { settings: [], documents: [], chunks: [], memory: [], attempts: [], reviewLog: [], sessions: [], strategy: [] };
}

export async function readSnapshot(store: RecallStore): Promise<Snapshot> {
  const snap = emptySnapshot();
  for (const c of COLLECTIONS) {
    (snap as Record<CollectionName, unknown[]>)[c] = await store.getAll(c);
  }
  return snap;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** In-memory store for tests and as a last-resort fallback when no persistent storage exists. */
export class MemoryStore implements RecallStore {
  private data = new Map<CollectionName, Map<string, unknown>>();
  /** Test hook: throw after this many operations inside the next batch (simulates an interrupted write). */
  failNextBatchAfter: number | null = null;

  constructor() {
    for (const c of COLLECTIONS) this.data.set(c, new Map());
  }

  async get<C extends CollectionName>(c: C, id: string): Promise<RecordMap[C] | undefined> {
    const v = this.data.get(c)?.get(id);
    return v === undefined ? undefined : clone(v as RecordMap[C]);
  }

  async getAll<C extends CollectionName>(c: C): Promise<RecordMap[C][]> {
    return [...(this.data.get(c)?.values() ?? [])].map((v) => clone(v as RecordMap[C]));
  }

  async batch(ops: StoreOp[]): Promise<void> {
    // Work on a copy, then swap: all-or-nothing.
    const next = new Map<CollectionName, Map<string, unknown>>();
    for (const [k, v] of this.data) next.set(k, new Map(v));
    let n = 0;
    for (const op of ops) {
      if (this.failNextBatchAfter !== null && n >= this.failNextBatchAfter) {
        this.failNextBatchAfter = null;
        throw new Error('Simulated interrupted write');
      }
      const col = next.get(op.collection);
      if (!col) throw new Error(`Unknown collection ${op.collection}`);
      if (op.type === 'put') col.set(op.value.id, clone(op.value));
      else col.delete(op.id);
      n++;
    }
    this.data = next;
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    const next = new Map<CollectionName, Map<string, unknown>>();
    for (const c of COLLECTIONS) {
      next.set(c, new Map(((snapshot[c] ?? []) as { id: string }[]).map((r) => [r.id, clone(r)])));
    }
    this.data = next;
  }

  async clearAll(): Promise<void> {
    for (const c of COLLECTIONS) this.data.set(c, new Map());
  }
}
