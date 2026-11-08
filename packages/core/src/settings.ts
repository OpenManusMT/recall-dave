import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  fontScale: 1.15,
  theme: 'system',
  highContrast: false,
  reduceMotion: false,
  readingFont: 'serif',
  inputPreference: 'typing',
  onboardingDone: false,
  chunkMode: 'auto',
  fixedChunkWords: 80,
  adaptiveChunkWords: 80,
  minChunkWords: 40,
  maxChunkWords: 180,
  askQuestions: true,
  schedulerMode: 'shadow',
  experimentalScorer: false,
  lastAdaptationSessionId: null,
  lastBackupAt: null,
};

export const FONT_SCALES: readonly { value: number; label: string }[] = [
  { value: 1, label: 'Standard' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Larger' },
  { value: 1.5, label: 'Very large' },
  { value: 1.75, label: 'Largest' },
];

export const FIXED_CHUNK_CHOICES: readonly { value: number; label: string }[] = [
  { value: 50, label: 'Short (about 50 words)' },
  { value: 80, label: 'Medium (about 80 words)' },
  { value: 120, label: 'Longer (about 120 words)' },
  { value: 160, label: 'Long (about 160 words)' },
];

/** Merge stored settings with defaults and clamp every value into its safe range. */
export function normaliseSettings(raw: Partial<Settings> | undefined | null): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) } as Settings;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const minChunkWords = Math.min(80, Math.max(20, Math.round(num(s.minChunkWords, 40))));
  const maxChunkWords = Math.min(
    300,
    Math.max(minChunkWords + 20, Math.round(num(s.maxChunkWords, 180))),
  );
  const clampWords = (v: number) => Math.min(maxChunkWords, Math.max(minChunkWords, Math.round(v)));
  return {
    id: 'settings',
    fontScale: Math.min(2, Math.max(0.9, num(s.fontScale, DEFAULT_SETTINGS.fontScale))),
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    highContrast: Boolean(s.highContrast),
    reduceMotion: Boolean(s.reduceMotion),
    readingFont: s.readingFont === 'sans' ? 'sans' : 'serif',
    inputPreference: s.inputPreference === 'dictation' ? 'dictation' : 'typing',
    onboardingDone: Boolean(s.onboardingDone),
    chunkMode: s.chunkMode === 'fixed' ? 'fixed' : 'auto',
    fixedChunkWords: clampWords(num(s.fixedChunkWords, 80)),
    adaptiveChunkWords: clampWords(num(s.adaptiveChunkWords, 80)),
    minChunkWords,
    maxChunkWords,
    askQuestions: s.askQuestions !== false,
    schedulerMode: 'shadow',
    experimentalScorer: Boolean(s.experimentalScorer),
    lastAdaptationSessionId:
      typeof s.lastAdaptationSessionId === 'string' ? s.lastAdaptationSessionId : null,
    lastBackupAt:
      typeof s.lastBackupAt === 'string' && !Number.isNaN(Date.parse(s.lastBackupAt))
        ? s.lastBackupAt
        : null,
  };
}

/**
 * Whether to show a gentle "keep a copy" reminder: browsers (including Safari) can clear
 * website data, so a backup protects progress. Never nags before there is something to lose.
 */
export function backupReminderDue(s: Settings, savedAnswers: number, now: Date): boolean {
  if (savedAnswers < 5) return false;
  if (!s.lastBackupAt) return true;
  return now.getTime() - Date.parse(s.lastBackupAt) > 30 * 86_400_000;
}

export function currentChunkTarget(s: Settings): number {
  return s.chunkMode === 'fixed' ? s.fixedChunkWords : s.adaptiveChunkWords;
}
