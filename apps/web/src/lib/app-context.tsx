import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSettings, MemoryStore, saveSettings, type RecallStore, type Settings, DEFAULT_SETTINGS } from '@recall/core';
import { IdbStore } from './idb-store';

export type Persistence = 'persistent' | 'best-effort' | 'memory-only';

interface AppState {
  store: RecallStore;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
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
    s.theme === 'dark' || (s.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.contrast = s.highContrast ? 'high' : 'normal';
  root.dataset.font = s.readingFont;
  root.dataset.motion = s.reduceMotion ? 'reduce' : 'auto';
  root.style.setProperty('--scale', String(s.fontScale));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#12161d' : '#1f4e8c');
}

/** Test hook: lets end-to-end tests pin the clock via `?now=` in the page URL (never used otherwise). */
function clock(): () => Date {
  const fixed = new URLSearchParams(window.location.search).get('now');
  if (fixed && !Number.isNaN(Date.parse(fixed))) {
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
      if (navigator.storage?.persisted && (await navigator.storage.persisted())) persistence = 'persistent';
      else if (navigator.storage?.persist && (await navigator.storage.persist())) persistence = 'persistent';
    } catch {
      /* not supported: best effort */
    }
    return { store, persistence };
  } catch {
    return { store: new MemoryStore(), persistence: 'memory-only' };
  }
}

export function AppProvider({ children, initialStore, initialPersistence }: { children: ReactNode; initialStore: RecallStore; initialPersistence: Persistence }) {
  const [store] = useState(initialStore);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const now = useMemo(clock, []);

  useEffect(() => {
    let alive = true;
    getSettings(store)
      .then((s) => {
        if (!alive) return;
        setSettings(s);
        applySettingsToDocument(s);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        setError('Recall could not read its saved data. You can still read, but progress may not be saved.');
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
      const next = await saveSettings(store, { ...settings, ...patch });
      setSettings(next);
      applySettingsToDocument(next);
    },
    [store, settings],
  );

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo<AppState>(
    () => ({ store, settings, updateSettings, dataVersion, refresh, persistence: initialPersistence, error, setError, now }),
    [store, settings, updateSettings, dataVersion, refresh, initialPersistence, error, now],
  );
  if (!ready) return <div className="main" aria-busy="true" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
