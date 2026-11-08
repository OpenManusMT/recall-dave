import { describe, expect, it } from 'vitest';
import { validateLibrary } from '@recall/core';
import { LIBRARY_PASSAGES, PROBE_PASSAGES, ALL_PASSAGES } from '../src/index';

describe('bundled content', () => {
  it('has at least 20 library passages and 6 fresh-text probes', () => {
    expect(LIBRARY_PASSAGES.length).toBeGreaterThanOrEqual(20);
    expect(PROBE_PASSAGES.length).toBeGreaterThanOrEqual(6);
  });

  it('passes the editorial validator (verbatim spans, qualifiers, word counts, UK spelling)', () => {
    expect(validateLibrary(ALL_PASSAGES)).toEqual([]);
  });

  it('keeps probes separate from practice passages at the dataset level', () => {
    for (const p of LIBRARY_PASSAGES) expect(p.kind).toBe('library');
    for (const p of PROBE_PASSAGES) expect(p.kind).toBe('probe');
    const libTitles = new Set(LIBRARY_PASSAGES.map((p) => p.title.toLowerCase()));
    for (const p of PROBE_PASSAGES) expect(libTitles.has(p.title.toLowerCase())).toBe(false);
  });

  it('contains no placeholder text', () => {
    const json = JSON.stringify(ALL_PASSAGES);
    expect(json).not.toMatch(/lorem|ipsum|TODO|TBD|placeholder|xxx/i);
  });

  it('covers a range of everyday subjects and densities', () => {
    expect(new Set(LIBRARY_PASSAGES.map((p) => p.subject)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(LIBRARY_PASSAGES.map((p) => p.density)).size).toBe(3);
  });
});
