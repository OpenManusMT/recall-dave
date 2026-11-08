import type { AuthoredPassage } from '@recall/core';
import p01 from './passages/p01-bread';

/** Practice passages, in the order they are offered by "Start a session". */
export const LIBRARY_PASSAGES: AuthoredPassage[] = [p01];

/** Fresh-text probes. Kept separate so transfer is never measured on practised material. */
export const PROBE_PASSAGES: AuthoredPassage[] = [];

export const ALL_PASSAGES: AuthoredPassage[] = [...LIBRARY_PASSAGES, ...PROBE_PASSAGES];

export function findPassage(id: string): AuthoredPassage | undefined {
  return ALL_PASSAGES.find((p) => p.id === id);
}
