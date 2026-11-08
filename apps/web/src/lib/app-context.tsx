import {
  createContext,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getSettings,
  MemoryStore,
  normaliseSettings,
  saveSettings,
  type RecallStore,
  type Settings,
  DEFAULT_SETTINGS,
} from '@recall/core';
import { IdbStore } from './idb-store';

export type Persistence = 'persistent' | 'best-effort' | 'memory-only';

interface AppState {
  store: RecallStore;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Adopt settings that core code has already saved (e.g. a session's part-size adaptation). */
  adoptSettings: (s: Settings) => void;
  /** Bumped after every data change so screens can reload. */
  dataVersion: number;
  refresh: () => void;
  persistence: Persistence;
  error: string | null;
  setError: (e: string | null) => void;
  now: () => Date;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

function applySettingsToDocument(s: Settings) {
  const root = document.documentElement;
  const dark =
    s.theme === 'dark' ||
    (s.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.contrast = s.highContrast ? 'high' : 'normal';
  root.dataset.font = s.readingFont;
  root.dataset.motion = s.reduceMotion ? 'reduce' : 'auto';
  root.style.setProperty('--scale', String(s.fontScale));
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', dark ? '#12161d' : '#1f4e8c');
    m.removeAttribute('media');
  });
}

/** Test hook: lets end-to-end tests pin the clock via `?now=` in the page URL (never used otherwise). */
function clock(): () => Date {
  const fixed = new URLSearchParams(window.location.search).get('now');
  // Only honoured on a local test server, never on a hosted copy (it would corrupt real schedules).
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (local && fixed && !Number.isNaN(Date.parse(fixed))) {
    const offset = Date.parse(fixed) - Date.now();
    return () => new Date(Date.now() + offset);
  }
  return () => new Date();
}

export async function openBestStore(): Promise<{ store: RecallStore; persistence: Persistence }> {
  try {
    if (!('indexedDB' in window)) throw new Error('no indexedDB');
    const store = await IdbStore.open();
    let persistence: Persistence = 'best-effort';
    try {
      if (navigator.storage?.persisted && (await navigator.storage.persisted()))
        persistence = 'persistent';
      else if (navigator.storage?.persist && (await navigator.storage.persist()))
        persistence = 'persistent';
    } catch {
      /* not supported: best effort */
    }
    return { store, persistence };
  } catch {
    return { store: new MemoryStore(), persistence: 'memory-only' };
  }
}

export function AppProvider({
  children,
  initialStore,
  initialPersistence,
}: {
  children: ReactNode;
  initialStore: RecallStore;
  initialPersistence: Persistence;
}) {
  const [store] = useState(initialStore);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const now = useMemo(clock, []);
  // Single source of truth for the newest settings: quick successive changes build on each
  // other, and an older copy (e.g. a screen's) can never overwrite a newer one.
  const latest = useRef<Settings>(DEFAULT_SETTINGS);
  const pendingWrites = useRef(0);

  useEffect(() => {
    let alive = true;
    getSettings(store)
      .then((s) => {
        if (!alive) return;
        // While a change is still being written, the in-memory copy is newer than storage.
        if (pendingWrites.current > 0) {
          setReady(true);
          return;
        }
        latest.current = s;
        setSettings(s);
        applySettingsToDocument(s);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        setError(
          'Recall could not read its saved data. You can still read, but progress may not be saved.',
        );
      });
    return () => {
      alive = false;
    };
  }, [store, dataVersion]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => applySettingsToDocument(settings);
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, [settings]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      // Optimistic: the control responds immediately.
      const next = normaliseSettings({ ...latest.current, ...patch });
      latest.current = next;
      setSettings(next);
      applySettingsToDocument(next);
      pendingWrites.current += 1;
      // Written immediately: IndexedDB commits overlapping read-write transactions in creation
      // order, and every write carries the complete newest settings, so the last change wins.
      try {
        await saveSettings(store, next);
      } catch {
        setError('That setting could not be saved. It will apply until you close Recall.');
      } finally {
        pendingWrites.current -= 1;
      }
    },
    [store],
  );

  const adoptSettings = useCallback((s: Settings) => {
    latest.current = s;
    setSettings(s);
    applySettingsToDocument(s);
  }, []);

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo<AppState>(
    () => ({
      store,
      settings,
      updateSettings,
      adoptSettings,
      dataVersion,
      refresh,
      persistence: initialPersistence,
      error,
      setError,
      now,
    }),
    [
      store,
      settings,
      updateSettings,
      adoptSettings,
      dataVersion,
      refresh,
      initialPersistence,
      error,
      now,
    ],
  );
  if (!ready) return <div className="main" aria-busy="true" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
