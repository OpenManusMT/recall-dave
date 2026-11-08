import { describe, expect, it } from '@jest/globals';
import { DEFAULT_SETTINGS } from '@recall/core';
import { MIN_TOUCH, readingFontFamily, resolvePalette, typeScale } from '../theme';

describe('resolvePalette', () => {
  it('follows the iPhone appearance when the theme is "system"', () => {
    expect(resolvePalette({ theme: 'system', highContrast: false }, 'dark').bg).toBe('#12161d');
    expect(resolvePalette({ theme: 'system', highContrast: false }, 'light').bg).toBe('#f7f6f2');
    expect(resolvePalette({ theme: 'system', highContrast: false }, null).dark).toBe(false);
  });

  it('lets an explicit choice override the iPhone appearance', () => {
    expect(resolvePalette({ theme: 'light', highContrast: false }, 'dark').dark).toBe(false);
    expect(resolvePalette({ theme: 'dark', highContrast: false }, 'light').dark).toBe(true);
  });

  it('uses the same high-contrast tokens as the web app', () => {
    const light = resolvePalette({ theme: 'light', highContrast: true }, 'light');
    expect([light.bg, light.text, light.border, light.primary]).toEqual(['#ffffff', '#000000', '#000000', '#002f6c']);
    const dark = resolvePalette({ theme: 'dark', highContrast: true }, 'light');
    expect([dark.bg, dark.text, dark.border, dark.primary]).toEqual(['#000000', '#ffffff', '#ffffff', '#a9c8ff']);
    expect(dark.highContrast).toBe(true);
  });
});

describe('typeScale', () => {
  it('scales every size with the learner’s text size', () => {
    const standard = typeScale(1);
    const largest = typeScale(1.75);
    expect(standard.body).toBe(17);
    expect(largest.body).toBeGreaterThan(standard.body);
    expect(largest.reading).toBeGreaterThan(standard.reading);
    expect(typeScale(DEFAULT_SETTINGS.fontScale).reading).toBeGreaterThanOrEqual(20);
  });
});

it('uses a book-style font only when chosen, and keeps touch targets at 48pt', () => {
  expect(readingFontFamily('sans')).toBeUndefined();
  expect(readingFontFamily('serif')).toBe('Iowan Old Style');
  expect(MIN_TOUCH).toBeGreaterThanOrEqual(48);
});
