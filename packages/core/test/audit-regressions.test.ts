// Regression tests for defects found by the independent final audit (docs/IMPROVEMENT-LOG.md, F1–F15).
import { describe, expect, it } from 'vitest';
import {
  computeInsights,
  createBackup,
  getActiveSession,
  getSettings,
  MemoryStore,
  newId,
  openPassage,
  parseBackup,
  readSnapshot,
  recordAttempt,
  saveDraft,
  scheduleFirstExposure,
  scheduleReview,
  startSession,
  suggestNextPassage,
  type ChunkRecord,
  type IdeaOutcome,
  type RecallStore,
} from '../src';
import { TEST_PASSAGE } from './helpers/fixtures';

const at = (s: string) => new Date(s);

async function learnAll(
  store: RecallStore,
  sessionId: string,
  chunk: ChunkRecord,
  now: Date,
  kind: 'learn' | 'read' = 'learn',
) {
  return recordAttempt(
    store,
    {
      attemptId: newId('att'),
      sessionId,
      documentId: chunk.documentId,
      chunkId: chunk.id,
      kind,
      startedAt: now.toISOString(),
      recallText: 'x',
      textPeeks: 0,
      ideas:
        kind === 'read'
          ? []
          : chunk.ideas.map((i) => ({ ideaId: i.id, outcome: 'correct', clueLevel: 0 })),
      question: chunk.questions[0]
        ? { questionId: chunk.questions[0].id, chosenIndex: 0, correct: true }
        : null,
      tooMuch: false,
    },
    now,
  );
}

async function review(
  store: RecallStore,
  sessionId: string,
  chunk: ChunkRecord,
  now: Date,
  outcome: IdeaOutcome,
  clue: 0 | 4,
) {
  return recordAttempt(
    store,
    {
      attemptId: newId('att'),
      sessionId,
      documentId: chunk.documentId,
      chunkId: chunk.id,
      kind: 'review',
      startedAt: now.toISOString(),
      recallText: 'x',
      textPeeks: 0,
      ideas: chunk.ideas.map((i) => ({ ideaId: i.id, outcome, clueLevel: clue })),
      question: chunk.questions[0]
        ? { questionId: chunk.questions[0].id, chosenIndex: 1, correct: false }
        : null,
      tooMuch: false,
    },
    now,
  );
}

describe('F1: part size adapts once per piece of evidence, not once per session', () => {
  it('does not keep shrinking when new sessions start without new answers', async () => {
    const store = new MemoryStore();
    const day0 = at('2026-11-08T10:00:00');
    const { session } = await startSession(store, 'remember', day0);
    const passages = [0, 1, 2].map((k) => ({ ...TEST_PASSAGE, id: `p9${k}-test-f1` }));
    const chunks: ChunkRecord[] = [];
    for (const p of passages)
      chunks.push((await openPassage(store, p, await getSettings(store), day0)).chunks[0]!);
    for (const c of chunks) await learnAll(store, session.id, c, day0);
    const day1 = at('2026-11-09T10:00:00');
    for (const c of chunks) await review(store, session.id, c, day1, 'incorrect', 4);
    const sizes: number[] = [];
    for (let k = 0; k < 4; k++) {
      const { settings } = await startSession(
        store,
        k % 2 ? 'read' : 'remember',
        at(`2026-11-09T1${k + 1}:00:00`),
      );
      sizes.push(settings.adaptiveChunkWords);
    }
    expect(sizes[0]).toBe(68); // one decrease on the evidence…
    expect(new Set(sizes).size).toBe(1); // …and no further change without new evidence
  });
});

describe('F2: elapsed time counts local calendar days', () => {
  it('an evening reading reviewed the next morning advances to the next step and counts as next-day', () => {
    const first = scheduleFirstExposure({
      ideaId: 'i',
      chunkId: 'c',
      documentId: 'd',
      isProbe: false,
      outcome: 'correct',
      clueLevel: 0,
      now: at('2026-11-08T21:00:00'),
    });
    const rev = scheduleReview(first.state, 'correct', 0, at('2026-11-09T08:00:00'));
    expect(rev.elapsedDays).toBe(1);
    expect(rev.state.step).toBe(1);
    expect(new Date(rev.state.authoritativeNextAt).getDate()).toBe(12); // 3 days
  });
  it('a same-calendar-day repeat still does not advance', () => {
    const first = scheduleFirstExposure({
      ideaId: 'i',
      chunkId: 'c',
      documentId: 'd',
      isProbe: false,
      outcome: 'correct',
      clueLevel: 0,
      now: at('2026-11-08T08:00:00'),
    });
    expect(scheduleReview(first.state, 'correct', 0, at('2026-11-08T22:00:00')).state.step).toBe(0);
  });
});

describe('F3: “Help me read” does not move the “Help me remember” position', () => {
  it('keeps separate positions', async () => {
    const store = new MemoryStore();
    const t = at('2026-11-08T10:00:00');
    const { session } = await startSession(store, 'read', t);
    const { document, chunks } = await openPassage(
      store,
      TEST_PASSAGE,
      await getSettings(store),
      t,
    );
    await learnAll(store, session.id, chunks[0]!, t, 'read');
    const doc = await store.get('documents', document.id);
    expect(doc?.nextChunkIndex).toBe(0);
    expect(doc?.readNextChunkIndex).toBe(1);
    expect((await readSnapshot(store)).memory).toHaveLength(0);
  });
});

describe('F4: unfinished work is continued, not discarded', () => {
  it('a new session keeps the previous session’s unsaved draft', async () => {
    const store = new MemoryStore();
    const t = at('2026-11-08T10:00:00');
    const { session } = await startSession(store, 'remember', t);
    const { document, chunks } = await openPassage(
      store,
      TEST_PASSAGE,
      await getSettings(store),
      t,
    );
    await saveDraft(
      store,
      session.id,
      {
        documentId: document.id,
        chunkId: chunks[0]!.id,
        phase: 'recall',
        recallText: 'half an answer',
        kind: 'learn',
      },
      t,
    );
    await startSession(store, 'remember', at('2026-11-08T11:00:00'));
    expect((await getActiveSession(store))?.draft?.recallText).toBe('half an answer');
  });
  it('an opened but not yet answered passage stays “next up”', async () => {
    const store = new MemoryStore();
    const t = at('2026-11-08T10:00:00');
    const other = { ...TEST_PASSAGE, id: 'p98-other', title: 'Other' };
    await openPassage(store, other, await getSettings(store), t);
    expect(suggestNextPassage([TEST_PASSAGE, other], await store.getAll('documents'))?.id).toBe(
      'p98-other',
    );
  });
});

describe('F9: “understanding questions” counts the first answer only', () => {
  it('ignores repeats of an already-explained question in reviews', async () => {
    const store = new MemoryStore();
    const t = at('2026-11-08T10:00:00');
    const { session } = await startSession(store, 'remember', t);
    const passages = [0, 1, 2].map((k) => ({ ...TEST_PASSAGE, id: `p9${k}-test-f9` }));
    for (const p of passages) {
      const c = (await openPassage(store, p, await getSettings(store), t)).chunks[0]!;
      await learnAll(store, session.id, c, t);
      await review(store, session.id, c, at('2026-11-09T10:00:00'), 'correct', 0);
    }
    const snap = await readSnapshot(store);
    const i = computeInsights(
      { attempts: snap.attempts, reviewLog: snap.reviewLog, settings: await getSettings(store) },
      at('2026-11-09T12:00:00'),
    );
    expect(i.practised.comprehension.n).toBe(3);
    expect(i.practised.comprehension.value).toBe(1);
  });
});

describe('F13: restoring a backup remembers that a backup exists', () => {
  it('sets “last backup” to the backup’s export time', async () => {
    const store = new MemoryStore();
    await getSettings(store);
    const snap = await readSnapshot(store);
    snap.settings = [await getSettings(store)];
    const r = parseBackup(JSON.stringify(createBackup(snap, at('2026-11-08T10:00:00Z'), '1.0.0')));
    expect(r.ok && r.snapshot.settings[0]?.lastBackupAt).toBe('2026-11-08T10:00:00.000Z');
  });
});
