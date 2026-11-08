/**
 * Colour and type tokens. These mirror the CSS custom properties in
 * apps/web/src/styles.css (light, dark and the two high-contrast variants) so
 * the iPhone app and the PWA look and feel the same.
 */
import { Platform } from 'react-native';
import type { Settings } from '@recall/core';

export interface Palette {
  dark: boolean;
  highContrast: boolean;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  focus: string;
}

const LIGHT: Palette = {
  dark: false,
  highContrast: false,
  bg: '#f7f6f2',
  surface: '#ffffff',
  surface2: '#eef1f5',
  text: '#1b2230',
  textMuted: '#4a5466',
  border: '#d5dae3',
  primary: '#1f4e8c',
  primaryText: '#ffffff',
  primarySoft: '#e3ecf8',
  accent: '#23704f',
  accentSoft: '#e2f1e9',
  warn: '#8a4b00',
  warnSoft: '#fbefdc',
  danger: '#a32121',
  dangerSoft: '#fbe5e5',
  focus: '#b35c00',
};

const DARK: Palette = {
  dark: true,
  highContrast: false,
  bg: '#12161d',
  surface: '#1b212b',
  surface2: '#232b37',
  text: '#e9edf3',
  textMuted: '#b3bccb',
  border: '#354052',
  primary: '#8db4ff',
  primaryText: '#0d1726',
  primarySoft: '#1f2e47',
  accent: '#7fd1a8',
  accentSoft: '#183327',
  warn: '#ffc27a',
  warnSoft: '#3a2a14',
  danger: '#ff9b9b',
  dangerSoft: '#3d1b1b',
  focus: '#ffb35c',
};

const HIGH_CONTRAST_LIGHT: Partial<Palette> = {
  bg: '#ffffff',
  surface: '#ffffff',
  surface2: '#ffffff',
  text: '#000000',
  textMuted: '#1a1a1a',
  border: '#000000',
  primary: '#002f6c',
  primarySoft: '#ffffff',
  accent: '#004d2b',
  accentSoft: '#ffffff',
  focus: '#c25100',
};

const HIGH_CONTRAST_DARK: Partial<Palette> = {
  bg: '#000000',
  surface: '#000000',
  surface2: '#000000',
  text: '#ffffff',
  textMuted: '#f0f0f0',
  border: '#ffffff',
  primary: '#a9c8ff',
  primarySoft: '#000000',
  accent: '#9ff0c4',
  accentSoft: '#000000',
};

/** Pick the palette from the learner's settings and the iPhone's light/dark appearance. */
export function resolvePalette(
  settings: Pick<Settings, 'theme' | 'highContrast'>,
  systemScheme: 'light' | 'dark' | null | undefined,
): Palette {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  const base = dark ? DARK : LIGHT;
  if (!settings.highContrast) return base;
  return { ...base, ...(dark ? HIGH_CONTRAST_DARK : HIGH_CONTRAST_LIGHT), highContrast: true };
}

/** Base UI size in points before the learner's text-size choice (17pt, the iOS body size). */
export const BASE_FONT = 17;

export interface TypeScale {
  body: number;
  small: number;
  h1: number;
  h2: number;
  reading: number;
  quote: number;
  label: number;
}

/** Sizes follow the web rem scale, multiplied by Settings.fontScale. iOS Dynamic Type is applied on top. */
export function typeScale(fontScale: number): TypeScale {
  const b = BASE_FONT * fontScale;
  return {
    body: Math.round(b),
    small: Math.round(b * 0.88),
    h1: Math.round(b * 1.6),
    h2: Math.round(b * 1.25),
    reading: Math.round(b * 1.18),
    quote: Math.round(b * 1.05),
    label: Math.round(b * 0.8),
  };
}

/** Reading font: Iowan Old Style ships with iOS (book style); otherwise the system font. */
export function readingFontFamily(readingFont: Settings['readingFont']): string | undefined {
  if (readingFont === 'sans') return undefined;
  return Platform.select({ ios: 'Iowan Old Style', android: 'serif', default: 'Georgia' });
}

/** Minimum touch target in points (WCAG 2.5.5 / Apple HIG ask for 44; we use 48 throughout). */
export const MIN_TOUCH = 48;
