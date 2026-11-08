/**
 * Local backup: export, validate, migrate and import.
 *
 * - Import never touches existing data until the whole file has been parsed,
 *   validated and migrated; then it replaces everything in one atomic step.
 * - Unknown fields are dropped; records that reference missing parents are
 *   dropped with a warning instead of corrupting the database.
 */
import { z } from 'zod';
import type { Snapshot } from './types';
import { COLLECTIONS } from './types';
import { normaliseSettings } from './settings';
import { emptySnapshot } from './store';

export const BACKUP_FORMAT = 'recall-backup';
/** v1: first release format. v2: adds `strategy` records and per-chunk `superseded`. */
export const BACKUP_SCHEMA_VERSION = 2;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date');
const id = z.string().min(1).max(300);
const clue = z.number().int().min(0).max(5);
const outcome = z.enum(['correct', 'partial', 'incorrect']);
const kind = z.enum(['learn', 'review', 'probe', 'read']);
const relation = z.enum(['cause_effect', 'sequence', 'comparison', 'rule_exception', 'fact']);

const ideaSchema = z.object({
  id,
  text: z.string().max(2000),
  sourceSpans: z.array(z.string().max(4000)).max(10),
  qualifiers: z.array(z.string().max(50)).max(20),
  relation,
  topic: z.string().max(200),
  cues: z.object({
    structural: z.string().max(400),
    semantic: z.string().max(400),
    cloze: z.string().max(4000),
    sentence: z.string().max(4000),
  }),
  origin: z.enum(['authored', 'heuristic']),
});

const questionSchema = z.object({
  id,
  prompt: z.string().max(500),
  options: z.array(z.string().max(300)).min(2).max(6),
  answerIndex: z.number().int().min(0).max(5),
  explanationSpan: z.string().max(4000),
});

export const recordSchemas = {
  settings: z.looseObject({ id: z.literal('settings') }),
  documents: z.object({
    id,
    title: z.string().max(300),
    text: z.string().max(60_000),
    createdAt: iso,
    updatedAt: iso,
    provenance: z.enum(['sample', 'pasted', 'probe']),
    passageId: z.string().max(100).nullable(),
    status: z.enum(['new', 'in_progress', 'finished']),
    nextChunkIndex: z.number().int().min(0),
    readNextChunkIndex: z.number().int().min(0).optional(),
    chunkCount: z.number().int().min(0),
  }),
  chunks: z.object({
    id,
    documentId: id,
    index: z.number().int().min(0),
    text: z.string().max(20_000),
    wordCount: z.number().int().min(0),
    plannedTargetWords: z.number().min(0),
    sectionIds: z.array(z.string().max(50)),
    ideas: z.array(ideaSchema).max(3),
    questions: z.array(questionSchema).max(10),
    createdAt: iso,
    superseded: z.boolean(),
  }),
  memory: z.object({
    id,
    chunkId: id,
    documentId: id,
    isProbe: z.boolean(),
    firstSeenAt: iso,
    lastReviewAt: iso,
    reviewCount: z.number().int().min(0),
    independentCount: z.number().int().min(0),
    highestClue: clue,
    clueHistory: z.array(clue).max(100),
    step: z.number().int().min(0).max(20),
    authoritativeNextAt: iso,
    fsrs: z.object({
      difficulty: z.number().min(1).max(10),
      stability: z.number().positive().max(1e6),
      reps: z.number().int().min(0),
      lapses: z.number().int().min(0),
    }),
    retrievability: z.number().min(0).max(1).nullable(),
    recommendedNextAt: iso,
    mode: z.literal('shadow'),
  }),
  attempts: z.object({
    id,
    sessionId: id,
    documentId: id,
    chunkId: id,
    kind,
    startedAt: iso,
    completedAt: iso,
    recallText: z.string().max(10_000),
    inputMethod: z.literal('typed'),
    textPeeks: z.number().int().min(0),
    ideas: z.array(z.object({ ideaId: id, outcome, clueLevel: clue })).max(3),
    question: z
      .object({ questionId: id, chosenIndex: z.number().int().min(0), correct: z.boolean() })
      .nullable(),
    tooMuch: z.boolean(),
    firstExposure: z.boolean(),
    elapsedDays: z.number().min(0).nullable(),
  }),
  reviewLog: z.object({
    id: z.string().min(1).max(700),
    attemptId: id,
    ideaId: id,
    at: iso,
    kind,
    outcome,
    clueLevel: clue,
    grade: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']),
    elapsedDays: z.number().min(0).nullable(),
    authoritativeDueBefore: iso.nullable(),
    recommendedBefore: iso.nullable(),
    authoritativeNextAt: iso,
    recommendedNextAt: iso,
    retrievabilityBefore: z.number().min(0).max(1).nullable(),
  }),
  sessions: z.object({
    id,
    startedAt: iso,
    updatedAt: iso,
    endedAt: iso.nullable(),
    status: z.enum(['active', 'finished']),
    mode: z.enum(['remember', 'read']),
    adaptation: z
      .object({
        action: z.enum(['increase', 'hold', 'decrease', 'not_enough_data', 'fixed_by_user']),
        fromWords: z.number(),
        toWords: z.number(),
        reason: z.string().max(500),
        window: z.object({
          chunks: z.number(),
          delayedRecall: z.number().nullable(),
          comprehension: z.number().nullable(),
          clueDependence: z.number().nullable(),
        }),
      })
      .nullable(),
    attemptIds: z.array(id),
    draft: z
      .object({
        documentId: id,
        chunkId: id,
        phase: z.enum(['reading', 'recall', 'question', 'check', 'done']),
        recallText: z.string().max(10_000),
        kind,
      })
      .nullable(),
  }),
  strategy: z.object({
    id,
    sessionId: id,
    at: iso,
    strategy: z.enum(['read_aloud', 'explain', 'show_text', 'too_much', 'reread']),
    chunkId: id.nullable(),
  }),
} as const;

const envelope = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().min(1),
  exportedAt: iso,
  app: z.object({ name: z.string(), version: z.string() }).optional(),
  data: z.record(z.string(), z.array(z.unknown())),
});

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  app: { name: string; version: string };
  data: Snapshot;
}

export function createBackup(snapshot: Snapshot, now: Date, appVersion: string): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    app: { name: 'Recall', version: appVersion },
    data: snapshot,
  };
}

type RawData = Record<string, unknown[]>;

/** Ordered migrations: key = version migrated FROM. Each returns data in version key+1. */
export const BACKUP_MIGRATIONS: Record<number, (d: RawData) => RawData> = {
  1: (d) => ({
    ...d,
    strategy: [],
    chunks: (d.chunks ?? []).map((c) => ({ superseded: false, ...(c as object) })),
  }),
};

export function migrateBackupData(data: RawData, fromVersion: number): RawData {
  let d = data;
  for (let v = fromVersion; v < BACKUP_SCHEMA_VERSION; v++) {
    const m = BACKUP_MIGRATIONS[v];
    if (!m) throw new Error(`No migration from backup version ${v}`);
    d = m(d);
  }
  return d;
}

export type ParseResult =
  | {
      ok: true;
      snapshot: Snapshot;
      migratedFrom: number | null;
      warnings: string[];
      counts: Record<string, number>;
    }
  | { ok: false; error: string };

/** Parse and fully validate a backup file. Never throws; never touches storage. */
export function parseBackup(text: string): ParseResult {
  if (typeof text !== 'string' || text.length === 0)
    return { ok: false, error: 'The file is empty.' };
  if (text.length > MAX_BACKUP_BYTES)
    return { ok: false, error: 'The file is too large to be a Recall backup.' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not a Recall backup (it could not be read as JSON).' };
  }
  const env = envelope.safeParse(json);
  if (!env.success)
    return { ok: false, error: 'This file is not a Recall backup, or it is damaged.' };
  const { schemaVersion } = env.data;
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup was made by a newer version of Recall. Please update the app first.',
    };
  }
  let data: RawData;
  try {
    data = migrateBackupData(env.data.data as RawData, schemaVersion);
  } catch (e) {
    return { ok: false, error: `This backup could not be upgraded: ${(e as Error).message}` };
  }
  const snap = emptySnapshot();
  const warnings: string[] = [];
  for (const c of COLLECTIONS) {
    const rows = data[c] ?? [];
    if (!Array.isArray(rows)) return { ok: false, error: `The backup section “${c}” is damaged.` };
    const schema = recordSchemas[c];
    const parsed: unknown[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = schema.safeParse(rows[i]);
      if (!r.success) {
        const issue = r.error.issues[0];
        return {
          ok: false,
          error: `The backup is damaged (${c} item ${i + 1}: ${issue?.path.join('.') || 'record'} ${issue?.message ?? 'is invalid'}). Nothing was changed.`,
        };
      }
      parsed.push(r.data);
    }
    (snap as Record<string, unknown[]>)[c] = parsed;
  }
  // Settings are clamped into safe ranges.
  snap.settings = snap.settings.length ? [normaliseSettings(snap.settings[0] as never)] : [];
  // The file itself is a backup made at `exportedAt`.
  if (snap.settings[0] && !snap.settings[0].lastBackupAt) {
    snap.settings[0] = { ...snap.settings[0], lastBackupAt: env.data.exportedAt };
  }
  // Referential integrity: drop orphans with a warning rather than importing broken links.
  const docIds = new Set(snap.documents.map((d) => d.id));
  const before = {
    chunks: snap.chunks.length,
    memory: snap.memory.length,
    attempts: snap.attempts.length,
  };
  snap.chunks = snap.chunks.filter((c) => docIds.has(c.documentId));
  const chunkIds = new Set(snap.chunks.map((c) => c.id));
  snap.memory = snap.memory.filter((m) => chunkIds.has(m.chunkId) && docIds.has(m.documentId));
  snap.attempts = snap.attempts.filter((a) => chunkIds.has(a.chunkId) && docIds.has(a.documentId));
  const attemptIds = new Set(snap.attempts.map((a) => a.id));
  snap.reviewLog = snap.reviewLog.filter((l) => attemptIds.has(l.attemptId));
  const dropped =
    before.chunks -
    snap.chunks.length +
    before.memory -
    snap.memory.length +
    before.attempts -
    snap.attempts.length;
  if (dropped > 0) warnings.push(`${dropped} unlinked item(s) were skipped.`);
  // Only one session may be active.
  let activeSeen = false;
  snap.sessions = snap.sessions
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((s) => {
      if (s.status !== 'active') return s;
      if (activeSeen)
        return { ...s, status: 'finished' as const, endedAt: s.updatedAt, draft: null };
      activeSeen = true;
      return s;
    });
  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c, snap[c].length]));
  return {
    ok: true,
    snapshot: snap,
    migratedFrom: schemaVersion === BACKUP_SCHEMA_VERSION ? null : schemaVersion,
    warnings,
    counts,
  };
}

export function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `recall-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
