import { describe, expect, it } from 'vitest';
import {
  applyAdaptation,
  BACKUP_SCHEMA_VERSION,
  computeInsights,
  createBackup,
  decideAdaptation,
  DEFAULT_SETTINGS,
  getSettings,
  MemoryStore,
  newId,
  openPassage,
  parseBackup,
  readSnapshot,
  recordAttempt,
  startSession,
  tooMuchTarget,
  type ChunkAttempt,
  type ReviewLogEntry,
  type Settings,
} from '../src';
import { TEST_PASSAGE } from './helpers/fixtures';

const T0 = new Date('2026-11-08T10:00:00');

async function populated() {
  const store = new MemoryStore();
  const { session } = await startSession(store, 'remember', T0);
  const { chunks } = await openPassage(store, TEST_PASSAGE, await getSettings(store), T0);
  const c = chunks[0]!;
  await recordAttempt(
    store,
    {
      attemptId: newId('att'),
      sessionId: session.id,
      documentId: c.documentId,
      chunkId: c.id,
      kind: 'learn',
      startedAt: T0.toISOString(),
      recallText: 'my words',
      textPeeks: 1,
      ideas: c.ideas.map((i) => ({ ideaId: i.id, outcome: 'correct', clueLevel: 0 })),
      question: null,
      tooMuch: false,
    },
    T0,
  );
  return store;
}

describe('backup', () => {
  it('round-trips export → import with identical data', async () => {
    const store = await populated();
    const snap = await readSnapshot(store);
    const file = JSON.stringify(createBackup(snap, T0, '1.0.0'));
    const parsed = parseBackup(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.migratedFrom).toBeNull();
    const fresh = new MemoryStore();
    await fresh.replaceAll(parsed.snapshot);
    expect(await readSnapshot(fresh)).toEqual(snap);
  });

  it('rejects files that are not backups, damaged JSON, and newer versions', () => {
    expect(parseBackup('')).toMatchObject({ ok: false });
    expect(parseBackup('{not json')).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ hello: 'world' }))).toMatchObject({ ok: false });
    const newer = {
      format: 'recall-backup',
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
      exportedAt: T0.toISOString(),
      data: {},
    };
    const r = parseBackup(JSON.stringify(newer));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/newer version/);
  });

  it('rejects a damaged record without changing anything and says which item', async () => {
    const store = await populated();
    const snap = await readSnapshot(store);
    const bad = structuredClone(createBackup(snap, T0, '1.0.0'));
    (bad.data.memory[0] as unknown as Record<string, unknown>).highestClue = 9;
    const r = parseBackup(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/memory item 1/);
    expect(await readSnapshot(store)).toEqual(snap);
  });

  it('migrates a version-1 backup (no strategy records, no superseded flag)', async () => {
    const store = await populated();
    const snap = await readSnapshot(store);
    const v1 = {
      format: 'recall-backup',
      schemaVersion: 1,
      exportedAt: T0.toISOString(),
      data: {
        ...snap,
        strategy: undefined,
        chunks: snap.chunks.map(({ superseded: _s, ...rest }) => rest),
      },
    };
    const r = parseBackup(JSON.stringify(v1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migratedFrom).toBe(1);
    expect(r.snapshot.chunks.every((c) => c.superseded === false)).toBe(true);
    expect(r.snapshot.strategy).toEqual([]);
  });

  it('drops orphaned records with a warning instead of importing broken links', async () => {
    const store = await populated();
    const snap = await readSnapshot(store);
    const b = createBackup({ ...snap, documents: [] }, T0, '1.0.0');
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.chunks).toHaveLength(0);
    expect(r.snapshot.memory).toHaveLength(0);
    expect(r.warnings.join(' ')).toMatch(/skipped/);
  });

  it('strips unknown fields (e.g. injected keys) and clamps settings', () => {
    const b = {
      format: 'recall-backup',
      schemaVersion: 2,
      exportedAt: T0.toISOString(),
      data: { settings: [{ id: 'settings', fontScale: 50, evil: '<script>' }] },
    };
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.settings[0]?.fontScale).toBeLessThanOrEqual(2);
    expect(JSON.stringify(r.snapshot)).not.toContain('evil');
  });
});

// --------------------------------------------------------------- adaptation

function fakeHistory(
  nChunks: number,
  delayedCredit: 'all' | 'half' | 'none',
  compCorrect: boolean,
  clue: 0 | 2,
) {
  const attempts: ChunkAttempt[] = [];
  const logs: ReviewLogEntry[] = [];
  for (let k = 0; k < nChunks; k++) {
    const when = new Date(T0.getTime() + k * 3_600_000).toISOString();
    const ideas = [0, 1].map((j) => ({
      ideaId: `c${k}i${j}`,
      outcome: 'correct' as const,
      clueLevel: clue,
    }));
    attempts.push({
      id: `a${k}`,
      sessionId: 's',
      documentId: 'd',
      chunkId: `c${k}`,
      kind: 'learn',
      startedAt: when,
      completedAt: when,
      recallText: '',
      inputMethod: 'typed',
      textPeeks: 0,
      ideas,
      question: { questionId: 'q', chosenIndex: 0, correct: compCorrect },
      tooMuch: false,
      firstExposure: true,
      elapsedDays: null,
    });
    ideas.forEach((i, j) => {
      const ok = delayedCredit === 'all' || (delayedCredit === 'half' && j === 0);
      logs.push({
        id: `l${k}${j}`,
        attemptId: `r${k}`,
        ideaId: i.ideaId,
        at: when,
        kind: 'review',
        outcome: ok ? 'correct' : 'incorrect',
        clueLevel: ok ? 0 : 4,
        grade: ok ? 'GOOD' : 'AGAIN',
        elapsedDays: 1.1,
        authoritativeDueBefore: when,
        recommendedBefore: when,
        authoritativeNextAt: when,
        recommendedNextAt: when,
        retrievabilityBefore: 0.9,
      });
    });
  }
  return { attempts, reviewLog: logs };
}

describe('chunk-size adaptation (engineering defaults, not clinical thresholds)', () => {
  const settings: Settings = { ...DEFAULT_SETTINGS };

  it('waits for a rolling window of delayed data instead of reacting to one attempt', () => {
    const d = decideAdaptation({ ...fakeHistory(2, 'none', false, 2), settings });
    expect(d.action).toBe('not_enough_data');
    expect(d.toWords).toBe(80);
  });

  it('increases by about 10% when delayed recall, comprehension and independence are all high', () => {
    const d = decideAdaptation({ ...fakeHistory(4, 'all', true, 0), settings });
    expect(d.action).toBe('increase');
    expect(d.toWords).toBe(88);
  });

  it('holds when comprehension is not high enough even if recall is', () => {
    expect(decideAdaptation({ ...fakeHistory(4, 'all', false, 0), settings }).action).toBe('hold');
  });

  it('holds in the 55–84% band and decreases by about 15% below 55%', () => {
    expect(decideAdaptation({ ...fakeHistory(4, 'half', true, 0), settings }).action).toBe(
      'decrease',
    ); // 50%
    const h = fakeHistory(4, 'all', true, 2); // high recall but hint dependence high
    expect(decideAdaptation({ ...h, settings }).action).toBe('hold');
    const dec = decideAdaptation({ ...fakeHistory(4, 'none', true, 0), settings });
    expect(dec).toMatchObject({ action: 'decrease', toWords: 68 });
  });

  it('respects the learner’s fixed size and the 40-word minimum', () => {
    expect(
      decideAdaptation({
        ...fakeHistory(4, 'none', true, 0),
        settings: { ...settings, chunkMode: 'fixed' },
      }).action,
    ).toBe('fixed_by_user');
    const low = decideAdaptation({
      ...fakeHistory(4, 'none', true, 0),
      settings: { ...settings, adaptiveChunkWords: 42 },
    });
    expect(low.toWords).toBeGreaterThanOrEqual(40);
  });

  it('applies at most one change per session', () => {
    const d = decideAdaptation({ ...fakeHistory(4, 'all', true, 0), settings });
    const once = applyAdaptation(settings, d, 'S1');
    const twice = applyAdaptation(once, { ...d, toWords: 200 }, 'S1');
    expect(once.adaptiveChunkWords).toBe(88);
    expect(twice).toBe(once);
  });

  it('“Too much text” reduces immediately from the smaller of target and shown chunk', () => {
    expect(tooMuchTarget(settings, 80)).toBe(68);
    expect(tooMuchTarget(settings, 60)).toBe(51);
    expect(tooMuchTarget({ ...settings, adaptiveChunkWords: 42 }, 42)).toBe(40);
  });
});

describe('insights', () => {
  it('says “Not measured yet” when nothing has been measured, and never invents delayed results', () => {
    const i = computeInsights({ attempts: [], reviewLog: [], settings: DEFAULT_SETTINGS }, T0);
    for (const m of [...Object.values(i.practised), ...Object.values(i.fresh)]) {
      expect(m.value).toBeNull();
      expect(m.display).toBe('Not measured yet');
    }
  });

  it('keeps practised material and fresh-text probes separate', () => {
    const h = fakeHistory(3, 'all', true, 0);
    const probe: ChunkAttempt = {
      ...h.attempts[0]!,
      id: 'p',
      kind: 'probe',
      ideas: [
        { ideaId: 'x', outcome: 'incorrect', clueLevel: 5 },
        { ideaId: 'y', outcome: 'incorrect', clueLevel: 5 },
        { ideaId: 'z', outcome: 'incorrect', clueLevel: 5 },
      ],
    };
    const i = computeInsights(
      { attempts: [...h.attempts, probe], reviewLog: h.reviewLog, settings: DEFAULT_SETTINGS },
      T0,
    );
    expect(i.practised.immediate.value).toBe(1);
    expect(i.practised.nextDay.value).toBe(1);
    expect(i.practised.week.display).toBe('Not measured yet');
    expect(i.fresh.immediate.value).toBe(0);
    expect(i.totals.freshChecks).toBe(1);
  });

  it('shows “Too few so far” below the minimum sample size', () => {
    const h = fakeHistory(1, 'all', true, 0);
    const i = computeInsights(
      { attempts: h.attempts, reviewLog: [], settings: DEFAULT_SETTINGS },
      T0,
    );
    expect(i.practised.comprehension.display).toMatch(/Too few so far/);
  });
});
