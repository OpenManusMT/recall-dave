/**
 * Renders the real ChunkFlow (read → hide → recall → question → clue ladder →
 * save) in Jest with an in-memory store, pressing the same buttons Dave would.
 * This checks the screen logic and wiring to @recall/core; it is not a
 * substitute for trying the app on an iPhone.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  getSettings,
  MemoryStore,
  openPassage,
  startSession,
  type ChunkRecord,
  type ReadingDocument,
  type SessionRecord,
} from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';
import { AppStateContext, type AppState } from '../../lib/app-context';
import { resolvePalette, typeScale } from '../../lib/theme';
import { ChunkFlow } from '../ChunkFlow';
import { Button } from '../ui';

jest.mock('../../lib/database', () => ({ openRecallStore: jest.fn() }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hideAsync: jest.fn(async () => true) }));
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(async () => []),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

const NOW = new Date('2026-11-08T10:00:00Z');

interface Setup {
  store: MemoryStore;
  value: AppState;
  document: ReadingDocument;
  chunk: ChunkRecord;
  session: SessionRecord;
}

async function setup(): Promise<Setup> {
  const store = new MemoryStore();
  const passage = LIBRARY_PASSAGES[0];
  if (!passage) throw new Error('no passages');
  const settings = await getSettings(store);
  const { document, chunks } = await openPassage(store, passage, settings, NOW);
  const { session } = await startSession(store, 'remember', NOW);
  const chunk = chunks[0];
  if (!chunk) throw new Error('no chunk');
  const value: AppState = {
    store,
    settings,
    updateSettings: async () => undefined,
    dataVersion: 0,
    refresh: () => undefined,
    persistence: 'persistent',
    error: null,
    setError: () => undefined,
    now: () => NOW,
    palette: resolvePalette(settings, 'light'),
    type: typeScale(settings.fontScale),
  };
  return { store, value, document, chunk, session };
}

async function renderFlow(s: Setup, kind: 'learn' | 'read' = 'learn') {
  await render(
    <AppStateContext.Provider value={s.value}>
      <ChunkFlow
        kind={kind}
        sessionId={s.session.id}
        document={s.document}
        chunk={s.chunk}
        ideas={s.chunk.ideas}
        partLabel="Part 1 of 3"
        progress={0.2}
        onDone={() => undefined}
        doneActions={() => <Button label="Next part" onPress={() => undefined} />}
      />
    </AppStateContext.Provider>,
  );
}

const press = async (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('ChunkFlow (Help me remember)', () => {
  let s: Setup;
  beforeEach(async () => {
    s = await setup();
  });

  it('reads, hides, recalls, answers, self-checks every point and saves one attempt', async () => {
    expect(s.chunk.ideas.length).toBeGreaterThan(0);
    await renderFlow(s);
    expect(screen.getByText('Read this part, then hide it')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeTruthy();

    // Explain this part shows the source-backed main points.
    await press('Explain this part');
    expect(screen.getByText('Main points')).toBeTruthy();
    expect(screen.getByText(s.chunk.ideas[0]?.text ?? '')).toBeTruthy();

    await press('I’ve read it — hide the text');
    expect(screen.getByText('What do you remember?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'I can’t remember — help me' })).toBeTruthy();

    // "Show text" peeks are counted.
    await press('Show text');
    await press('Hide the text again');

    await fireEvent.changeText(screen.getByLabelText('Your words'), 'Something about bread and yeast');
    await press('Check my answer');

    const question = s.chunk.questions[0];
    if (question) {
      expect(screen.getByText('A quick question')).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: `A. ${question.options[0]}` }));
      await press('Continue');
    }

    for (let k = 0; k < s.chunk.ideas.length; k++) {
      expect(screen.getByText(`Check point ${k + 1} of ${s.chunk.ideas.length}`)).toBeTruthy();
      await press('Yes, I wrote about it');
      await press('Yes, it matches');
      expect(screen.getByText('You remembered this point on your own.')).toBeTruthy();
      await press(k < s.chunk.ideas.length - 1 ? 'Next point' : 'Save and continue');
    }

    expect(await screen.findByText(/on your own\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next part' })).toBeTruthy();

    const attempts = await s.store.getAll('attempts');
    expect(attempts).toHaveLength(1);
    const attempt = attempts[0];
    expect(attempt?.kind).toBe('learn');
    expect(attempt?.textPeeks).toBe(1);
    expect(attempt?.recallText).toBe('Something about bread and yeast');
    expect(attempt?.ideas.every((i) => i.outcome === 'correct' && i.clueLevel === 0)).toBe(true);
    if (question) expect(attempt?.question).toEqual({ questionId: question.id, chosenIndex: 0, correct: question.answerIndex === 0 });
    expect(await s.store.getAll('memory')).toHaveLength(s.chunk.ideas.length);
  });

  it('walks the clue ladder in small steps and records the highest help used', async () => {
    await renderFlow(s);
    await press('I’ve read it — hide the text');
    await press('I can’t remember — help me');
    if (s.chunk.questions[0]) await press('Skip this question');

    // Point 1: hint → stronger hint → the sentence → "Got it" (recorded at level 4).
    await press('No, or I’m not sure — give me a hint');
    expect(screen.getByText('Hint')).toBeTruthy();
    await press('Another hint');
    expect(screen.getByText('Stronger hint')).toBeTruthy();
    await press('Show me the sentence');
    expect(screen.getByText('Read it slowly. It will come up again in a review, which helps it stick.')).toBeTruthy();
    await press('Got it');
    expect(
      screen.getByText('Now you have seen this point. It will come up again in a review, which helps it stick.'),
    ).toBeTruthy();

    // Any further points: remembered after the starting point, partly matching (level 1, partial).
    for (let k = 1; k < s.chunk.ideas.length; k++) {
      await press('Next point');
      await press('I remember it now — show me');
      expect(screen.getByText('Was that what you remembered?')).toBeTruthy();
      await press('Partly');
    }
    await press('Save and continue');
    expect(await screen.findByRole('button', { name: 'Next part' })).toBeTruthy();

    const [attempt] = await s.store.getAll('attempts');
    expect(attempt?.question).toBeNull();
    expect(attempt?.ideas[0]).toMatchObject({ outcome: 'incorrect', clueLevel: 4 });
    for (const i of attempt?.ideas.slice(1) ?? []) expect(i).toMatchObject({ outcome: 'partial', clueLevel: 1 });
  });
});

describe('ChunkFlow (Help me read)', () => {
  it('keeps the text visible and saves without a self-check', async () => {
    const s = await setup();
    await renderFlow(s, 'read');
    expect(screen.getByText('Read this part')).toBeTruthy();
    const question = s.chunk.questions[0];
    if (question) {
      expect(screen.getByRole('button', { name: 'Answer the question to continue' })).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: `A. ${question.options[0]}` }));
    }
    await press('Next');
    expect(await screen.findByText('Part finished.')).toBeTruthy();
    const [attempt] = await s.store.getAll('attempts');
    expect(attempt?.kind).toBe('read');
    expect(attempt?.ideas).toEqual([]);
    expect(await s.store.getAll('memory')).toHaveLength(0);
  });
});
