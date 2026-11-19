import type { StatusDisplay } from '../statusDisplay';
import {
  groupAttendanceDisplay,
  homeworkDisplay,
  privateAttendanceDisplay,
  privateSessionDetail,
  privateSessionTitle,
  workLogSourceLabel,
  type PrivateAttendance,
} from '../weeklyReportDisplay';

describe('privateAttendanceDisplay', () => {
  const cases: [PrivateAttendance, StatusDisplay][] = [
    ['attended', { label: 'Attended', tone: 'success' }],
    ['missed', { label: 'Missed', tone: 'warning' }],
    ['unmarked', { label: 'Not marked', tone: 'neutral' }],
  ];
  it.each(cases)('%s', (attendance, expected) => {
    expect(privateAttendanceDisplay[attendance]).toEqual(expected);
  });
});

describe('privateSessionDetail', () => {
  const cases: [PrivateAttendance, boolean, string][] = [
    ['attended', true, 'Worked on rook endgames'],
    ['attended', false, 'Notes not submitted yet'],
    ['missed', true, ''],
    ['missed', false, ''],
    ['unmarked', true, 'Attendance not marked yet'],
    ['unmarked', false, 'Attendance not marked yet'],
  ];
  it.each(cases)('%s, submitted %s', (attendance, submitted, expected) => {
    expect(privateSessionDetail({ attendance, submitted, notes: 'Worked on rook endgames' })).toBe(expected);
  });

  it('gives an empty line for an attended, submitted row with empty notes', () => {
    expect(privateSessionDetail({ attendance: 'attended', submitted: true, notes: '' })).toBe('');
  });
});

describe('privateSessionTitle', () => {
  it('names the coach', () => {
    expect(privateSessionTitle('Sivakami Ramanathan')).toBe('Session with Sivakami Ramanathan');
  });
  it('falls back without a coach', () => {
    expect(privateSessionTitle('')).toBe('Private session');
  });
});

describe('groupAttendanceDisplay', () => {
  const cases: [boolean | null, StatusDisplay][] = [
    [true, { label: 'Present', tone: 'success' }],
    [false, { label: 'Absent', tone: 'danger' }],
    [null, { label: 'Not marked', tone: 'neutral' }],
  ];
  it.each(cases)('%s', (present, expected) => {
    expect(groupAttendanceDisplay(present)).toEqual(expected);
  });
});

describe('homeworkDisplay', () => {
  it('has no chip without homework', () => {
    expect(homeworkDisplay(null)).toBeNull();
  });
  it('shows a complete homework as 100%', () => {
    expect(homeworkDisplay({ complete: true, completion: 100 })).toEqual({ label: 'Homework 100%', tone: 'success' });
  });
  it('shows partial completion with its percent', () => {
    expect(homeworkDisplay({ complete: false, completion: 60 })).toEqual({ label: 'Homework 60%', tone: 'warning' });
  });
  it('shows zero completion as not done', () => {
    expect(homeworkDisplay({ complete: false, completion: 0 })).toEqual({ label: 'Homework not done', tone: 'warning' });
  });
});

describe('workLogSourceLabel', () => {
  it('labels a synced row', () => {
    expect(workLogSourceLabel({ kind: 'auto', tools: [] }, 'Ajay')).toBe('Synced');
  });
  it('lists the tools', () => {
    expect(workLogSourceLabel({ kind: 'manual', tools: ['Lichess', 'Chess.com'] }, 'Ajay')).toBe('Lichess, Chess.com');
  });
  it('names the child for a manual row with no tools', () => {
    expect(workLogSourceLabel({ kind: 'manual', tools: [] }, 'Ajay')).toBe('Logged by Ajay');
  });
  it('falls back without a child name', () => {
    expect(workLogSourceLabel({ kind: 'manual', tools: [] }, '')).toBe('Logged by student');
  });
});
