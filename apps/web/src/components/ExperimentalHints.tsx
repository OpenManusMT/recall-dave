import type { KeyIdeaSnapshot } from '@recall/core';

/**
 * Experimental local matching hints are disabled in this release: the local
 * candidate scorer has not passed the A001 acceptance gate (see
 * docs/RELEASE-REPORT.md). Nothing is shown and nothing affects the schedule.
 */
export function ExperimentalHints(_props: { idea: KeyIdeaSnapshot; recallText: string }) {
  return null;
}
