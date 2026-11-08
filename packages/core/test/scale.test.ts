// Measurement from improvement pass 3: a year of heavy daily use must stay fast on-device.
import { describe, expect, it } from 'vitest';
import {
  computeInsights,
  dueReviewGroups,
  getSettings,
  MemoryStore,
  newId,
  openPassage,
  readSnapshot,
  recordAttempt,
  startSession,
} from '../src';
import { TEST_PASSAGE } from './helpers/fixtures';

describe('scale', () => {
  it('a year of daily use (≈1,100 parts, ≈2,200 points) keeps insights and due-review queries fast', async () => {
    const store = new MemoryStore();
    const day = 86_400_000;
    const start = new Date('2025-11-01T09:00:00Z').getTime();
    const settings = await getSettings(store);
    const t0 = performance.now();
    for (let d = 0; d < 365; d++) {
      const now = new Date(start + d * day);
      const { session } = await startSession(store, 'remember', now);
      for (let k = 0; k < 3; k++) {
        const passage = { ...TEST_PASSAGE, id: `p99-test-${d}-${k}` };
        const { chunks } = await openPassage(store, passage, settings, now);
        const c = chunks[0]!;
        await recordAttempt(
          store,
          {
            attemptId: newId('att'),
            sessionId: session.id,
            documentId: c.documentId,
            chunkId: c.id,
            kind: 'learn',
            startedAt: now.toISOString(),
            recallText: 'some words about the part',
            textPeeks: 0,
            ideas: c.ideas.map((i, j) => ({
              ideaId: i.id,
              outcome: j ? 'partial' : 'correct',
              clueLevel: j ? 2 : 0,
            })),
            question: null,
            tooMuch: false,
          },
          now,
        );
      }
    }
    const seedMs = performance.now() - t0;
    const now = new Date(start + 366 * day);
    const t1 = performance.now();
    const snap = await readSnapshot(store);
    const insights = computeInsights(
      { attempts: snap.attempts, reviewLog: snap.reviewLog, settings },
      now,
    );
    const t2 = performance.now();
    const due = await dueReviewGroups(store, now);
    const t3 = performance.now();
    console.log(
      `seed ${seedMs.toFixed(0)} ms; ${snap.attempts.length} attempts, ${snap.memory.length} points; insights ${(t2 - t1).toFixed(1)} ms; due groups ${due.length} in ${(t3 - t2).toFixed(1)} ms`,
    );
    expect(insights.totals.partsRead).toBe(1095);
    expect(t2 - t1).toBeLessThan(500);
    expect(t3 - t2).toBeLessThan(500);
  }, 120_000);
});
