/**
 * Whole-app smoke test: renders the real Expo Router routes in src/app with an
 * in-memory store instead of SQLite, and walks the main journey through the
 * tabs and focused screens. It checks routing and screen wiring in Jest; it is
 * not a substitute for trying the app on an iPhone.
 */
import path from 'path';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { getSettings, MemoryStore, openPassage, recordAttempt, saveSettings, startSession, finishSession } from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
// Each test can seed the store the app will open (instead of expo-sqlite).
const seeded: { store: unknown } = { store: null };
jest.mock('../lib/database', () => {
  const { MemoryStore } = require('@recall/core');
  return { openRecallStore: jest.fn(async () => seeded.store ?? new MemoryStore()) };
});
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hideAsync: jest.fn(async () => true) }));
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(async () => []),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

const APP_DIR = path.resolve(__dirname, '../app');
const press = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));

describe('Recall app navigation', () => {
  beforeEach(() => {
    seeded.store = null;
  });

  it('onboards, starts a session, pauses, resumes from Home, and visits every tab', async () => {
    const first = LIBRARY_PASSAGES[0];
    if (!first) throw new Error('no passages');
    const router = await renderRouter(APP_DIR, { initialUrl: '/' });

    // First launch goes to the welcome screens, which can be skipped.
    expect(await screen.findByText('Welcome to Recall')).toBeTruthy();
    expect(router.getPathname()).toBe('/welcome');
    await press('Continue');
    expect(await screen.findByText('Choose a comfortable text size')).toBeTruthy();
    await press('Continue');
    expect(await screen.findByText('How would you like to answer?')).toBeTruthy();
    await press('Start');

    // Home
    expect(await screen.findByText('Read a little, remember the main points, come back later.')).toBeTruthy();
    expect(router.getPathname()).toBe('/');
    expect(screen.getByText(`Next up: “${first.title}”.`)).toBeTruthy();

    // Start a session → the next suggested passage (no reviews are due yet).
    await press('Start a session');
    expect(await screen.findByText('Read this part, then hide it')).toBeTruthy();
    expect(router.getPathname()).toBe(`/read/${first.id}`);
    await press('I’ve read it — hide the text');
    expect(await screen.findByText('What do you remember?')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Your words'), 'Bread needs flour');

    // Pause → Home offers to continue where Dave left off.
    await press('Pause');
    expect(await screen.findByText('Continue where you left off')).toBeTruthy();
    expect(router.getPathname()).toBe('/');
    await press('Continue where you left off');
    expect(await screen.findByText('What do you remember?')).toBeTruthy();
    expect(screen.getByDisplayValue('Bread needs flour')).toBeTruthy();
    await press('Pause');
    expect(await screen.findByText('Continue where you left off')).toBeTruthy();

    // Tabs
    await fireEvent.press(screen.getByRole('button', { name: 'Read' }));
    expect(await screen.findByText('Choose something to read')).toBeTruthy();
    expect(screen.getByText(first.title)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reviews' }));
    expect(await screen.findByText('Nothing is due right now.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Progress' }));
    expect(await screen.findByText('Practised material')).toBeTruthy();
    expect(screen.getByText('Fresh text (never seen before)')).toBeTruthy();
    expect(screen.getAllByText('Not measured yet').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Privacy and your data')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete all data' })).toBeTruthy();

    // Paste your own reading.
    await fireEvent.press(screen.getByRole('button', { name: 'Read' }));
    await press('Paste your own reading');
    expect(await screen.findByText('Save and start reading')).toBeTruthy();
    expect(router.getPathname()).toBe('/add');
  });

  it('runs due reviews first, then something new, and finishes the session', async () => {
    // Seed: onboarding done, and one part of the first passage read three days ago.
    const store = new MemoryStore();
    const first = LIBRARY_PASSAGES[0];
    if (!first) throw new Error('no passages');
    const past = new Date(Date.now() - 3 * 86_400_000);
    await saveSettings(store, { ...(await getSettings(store)), onboardingDone: true, askQuestions: false });
    const settings = await getSettings(store);
    const { document, chunks } = await openPassage(store, first, settings, past);
    const chunk = chunks[0];
    if (!chunk) throw new Error('no chunk');
    const { session } = await startSession(store, 'remember', past);
    await recordAttempt(
      store,
      {
        attemptId: 'att_seed',
        sessionId: session.id,
        documentId: document.id,
        chunkId: chunk.id,
        kind: 'learn',
        startedAt: past.toISOString(),
        recallText: 'seed',
        textPeeks: 0,
        ideas: chunk.ideas.map((i) => ({ ideaId: i.id, outcome: 'correct' as const, clueLevel: 0 as const })),
        question: null,
        tooMuch: false,
      },
      past,
    );
    await finishSession(store, session.id, past);
    seeded.store = store;
    const n = chunk.ideas.length;

    const router = await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText(`Starts with ${n === 1 ? '1 point' : `${n} points`} to remember again, then something new.`)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Reviews, ${n} due` })).toBeTruthy();

    await press('Start a session');
    expect(await screen.findByText('What do you remember from this part?')).toBeTruthy();
    expect(router.getPathname()).toBe('/review-run');
    await press('I can’t remember — help me');
    for (let k = 0; k < n; k++) {
      await press('No, or I’m not sure — give me a hint');
      await press('Read the whole part again');
      expect(await screen.findByText('The whole part')).toBeTruthy();
      await press('Got it');
      await press(k < n - 1 ? 'Next point' : 'Save and continue');
    }
    await press('Continue');
    expect(await screen.findByText('Reviews done')).toBeTruthy();

    await press('Now read something new');
    expect(await screen.findByText('Read this part, then hide it')).toBeTruthy();
    expect(router.getPathname()).toBe(`/read/${first.id}`);
    expect(screen.getByText(`Part 2 of ${chunks.length}`)).toBeTruthy();

    await press('Pause');
    expect(await screen.findByText('Continue where you left off')).toBeTruthy();
    const reviews = await store.getAll('reviewLog');
    expect(reviews.filter((r) => r.kind === 'review')).toHaveLength(n);
    expect(reviews.filter((r) => r.kind === 'review').every((r) => r.clueLevel === 5)).toBe(true);
  });

  it('deletes all data after confirmation and returns to the welcome screens', async () => {
    const store = new MemoryStore();
    await saveSettings(store, { ...(await getSettings(store)), onboardingDone: true });
    seeded.store = store;
    const alert = jest.spyOn(Alert, 'alert');
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await press('Delete all data');
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0] ?? [];
    expect(title).toBe('Delete all data?');
    const destroy = (buttons ?? []).find((b) => b.text === 'Delete everything');
    expect(destroy?.style).toBe('destructive');
    // The confirm button of the native alert.
    await act(async () => {
      destroy?.onPress?.();
    });
    expect(await screen.findByText('Welcome to Recall')).toBeTruthy();
    expect((await getSettings(store)).onboardingDone).toBe(false);
    alert.mockRestore();
  });
});
