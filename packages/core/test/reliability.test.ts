// Regression tests from improvement pass 2 (reliability/safety). See docs/IMPROVEMENT-LOG.md.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  backupReminderDue,
  breakLongSentence,
  calendarDaysBetween,
  countWords,
  DEFAULT_SETTINGS,
  describeDue,
  MAX_BACKUP_BYTES,
  parseBackup,
  planPastedChunks,
  scheduleFirstExposure,
  scheduleReview,
} from '../src';

const first = (now: Date) =>
  scheduleFirstExposure({
    ideaId: 'i',
    chunkId: 'c',
    documentId: 'd',
    isProbe: false,
    outcome: 'correct',
    clueLevel: 0,
    now,
  });

describe('R1: daylight-saving changes (Europe/London)', () => {
  const prev = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'Europe/London';
  });
  afterAll(() => {
    process.env.TZ = prev;
  });

  it('clocks go back (25 Oct 2026): due at local midnight of the next calendar day', () => {
    const now = new Date('2026-10-24T22:30:00+01:00'); // Saturday evening, BST
    const due = new Date(first(now).state.authoritativeNextAt);
    expect(due.getDate()).toBe(25);
    expect(due.getHours()).toBe(0);
    expect(calendarDaysBetween(now, due)).toBe(1);
    expect(describeDue(due.toISOString(), now)).toBe('tomorrow');
  });

  it('clocks go forward (29 Mar 2026): due dates still land on local midnight', () => {
    const now = new Date('2026-03-28T23:30:00Z'); // Saturday, GMT
    const st = first(now).state;
    const due = new Date(st.authoritativeNextAt);
    expect(due.getDate()).toBe(29);
    expect(due.getHours()).toBe(0);
    // A review 3 days later after the change: step 1 → 3 days, due at local midnight (BST).
    const rev = scheduleReview(st, 'correct', 0, new Date('2026-03-30T09:00:00+01:00'));
    const due2 = new Date(rev.state.authoritativeNextAt);
    expect(due2.getHours()).toBe(0);
    expect(due2.getDate()).toBe(2);
  });
});

describe('R12: the device clock moving backwards', () => {
  it('does not produce negative intervals or advance the schedule', () => {
    const st = first(new Date('2026-11-10T10:00:00Z')).state;
    const rev = scheduleReview(st, 'correct', 0, new Date('2026-11-09T10:00:00Z'));
    expect(rev.elapsedDays).toBe(0);
    expect(rev.state.step).toBe(st.step);
    expect(Number.isFinite(rev.state.fsrs.stability)).toBe(true);
  });
});

describe('R16: pasted text without sentence punctuation', () => {
  it('is broken into parts no larger than the maximum, preferring commas', () => {
    const blob = Array.from({ length: 500 }, (_, i) =>
      i % 37 === 36 ? `word${i},` : `word${i}`,
    ).join(' ');
    const pieces = breakLongSentence(blob, 180);
    expect(pieces.length).toBeGreaterThan(2);
    for (const p of pieces) expect(countWords(p)).toBeLessThanOrEqual(180);
    expect(pieces.join(' ')).toBe(blob);
    const chunks = planPastedChunks(blob, { targetWords: 80, minWords: 40, maxWords: 180 }, 'x');
    for (const c of chunks) expect(c.wordCount).toBeLessThanOrEqual(180);
  });
});

describe('R9b: backup reminder', () => {
  const now = new Date('2026-12-01T10:00:00Z');
  it('never nags before there is something to lose', () => {
    expect(backupReminderDue(DEFAULT_SETTINGS, 4, now)).toBe(false);
  });
  it('reminds when there is no backup, or the last one is over 30 days old', () => {
    expect(backupReminderDue(DEFAULT_SETTINGS, 5, now)).toBe(true);
    expect(
      backupReminderDue({ ...DEFAULT_SETTINGS, lastBackupAt: '2026-11-20T10:00:00Z' }, 50, now),
    ).toBe(false);
    expect(
      backupReminderDue({ ...DEFAULT_SETTINGS, lastBackupAt: '2026-10-01T10:00:00Z' }, 50, now),
    ).toBe(true);
  });
});

describe('R4: oversized import', () => {
  it('rejects files larger than the backup limit without parsing', () => {
    const r = parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1));
    expect(r.ok).toBe(false);
  });
});
