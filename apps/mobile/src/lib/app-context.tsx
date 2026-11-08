import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  DEFAULT_SETTINGS,
  getSettings,
  MemoryStore,
  saveSettings,
  type RecallStore,
  type Settings,
} from '@recall/core';
import { openRecallStore } from './database';
import { resolvePalette, typeScale, type Palette, type TypeScale } from './theme';

/** "persistent": SQLite on this iPhone. "memory-only": storage could not be opened (nothing is kept). */
export type Persistence = 'persistent' | 'memory-only';

export interface AppState {
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
  palette: Palette;
  type: TypeScale;
}

const Ctx = createContext<AppState | null>(null);

/** Provides a ready-made app state (used by tests; the app itself uses AppProvider). */
export const AppStateContext = Ctx;

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

const now = () => new Date();

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [store, setStore] = useState<RecallStore | null>(null);
  const [persistence, setPersistence] = useState<Persistence>('persistent');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Open the on-device database once.
  useEffect(() => {
    let alive = true;
    openRecallStore()
      .then((s) => {
        if (alive) setStore(s);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setStore(new MemoryStore());
        setPersistence('memory-only');
        const msg = e instanceof Error && /newer version/.test(e.message) ? e.message : null;
        setError(
          msg ??
            'Recall could not open its storage on this iPhone. You can still read, but progress will not be saved.',
        );
      });
    return () => {
      alive = false;
    };
  }, []);

  // (Re)load settings whenever data changes (e.g. after a backup import or "Delete all data").
  useEffect(() => {
    if (!store) return;
    let alive = true;
    getSettings(store)
      .then((s) => {
        if (alive) setSettings(s);
      })
      .catch(() => {
        if (alive) setError('Recall could not read its saved data. You can still read, but progress may not be saved.');
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [store, dataVersion]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!store) return;
      const next = await saveSettings(store, { ...settings, ...patch });
      setSettings(next);
    },
    [store, settings],
  );

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);
  const palette = useMemo(() => resolvePalette(settings, scheme), [settings, scheme]);
  const type = useMemo(() => typeScale(settings.fontScale), [settings.fontScale]);

  const value = useMemo<AppState | null>(
    () =>
      store
        ? { store, settings, updateSettings, dataVersion, refresh, persistence, error, setError, now, palette, type }
        : null,
    [store, settings, updateSettings, dataVersion, refresh, persistence, error, palette, type],
  );

  if (!ready || !value) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} accessibilityLabel="Opening Recall" />;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
