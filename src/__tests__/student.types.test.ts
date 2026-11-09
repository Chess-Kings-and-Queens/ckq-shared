import type { NextSession, PortalMakeupClass, PortalStudent, SubscriptionCalculation } from '../types/student';

describe('SubscriptionCalculation', () => {
  test('is importable and assignable from a backend-shaped literal', () => {
    const calc: SubscriptionCalculation = { originalAmount: 120, finalAmount: 108, sessionCount: 4 };
    expect(calc.finalAmount).toBe(108);
    expect(calc.sessionCount).toBe(4);
  });
});

describe('PortalMakeupClass', () => {
  test('is assignable from a backend-shaped literal with every field', () => {
    const makeup: PortalMakeupClass = {
      sessionId: 'session-1',
      scheduleId: 'schedule-1',
      date: '2026-11-12',
      startsAt: '2026-11-12T22:00:00.000Z',
      endsAt: '2026-11-12T23:00:00.000Z',
      label: 'Thursday',
      timeLabel: '5:00 PM – 6:00 PM ET',
      isToday: false,
      levelName: 'Level 1',
      coachName: 'Alex Coach',
      locationName: 'Online',
      isOnline: true,
      classLink: null,
      forLabel: 'Sun, Nov 8',
      forDate: '2026-11-08',
      forScheduleId: 'schedule-1',
    };
    expect(makeup.forDate).toBe('2026-11-08');
    expect(makeup.forScheduleId).toBe('schedule-1');
    expect(makeup.classLink).toBeNull();
    expect(makeup.forLabel).toBe('Sun, Nov 8');
  });
  test('the covered-class fields are empty strings when its record is gone', () => {
    const makeup: PortalMakeupClass = {
      sessionId: 'session-2',
      scheduleId: 'schedule-2',
      date: '2026-11-13',
      startsAt: '2026-11-13T22:00:00.000Z',
      endsAt: '2026-11-13T23:00:00.000Z',
      label: 'Friday',
      timeLabel: '5:00 PM – 6:00 PM ET',
      isToday: false,
      levelName: 'Level 1',
      coachName: '',
      locationName: 'Online',
      isOnline: true,
      classLink: null,
      forLabel: '',
      forDate: '',
      forScheduleId: '',
    };
    expect(makeup.forDate).toBe('');
    expect(makeup.forScheduleId).toBe('');
  });
});

describe('PortalStudent.makeupClasses', () => {
  const base: Omit<PortalStudent, 'makeupClasses' | 'nextSession'> = {
    _id: 'student-1',
    firstName: 'Sam',
    lastName: 'Student',
    trialClass: null,
    activeSubscription: null,
    activeGroupClassRegistration: null,
    premiumSchedules: null,
    nextTrialClass: null,
    previousClasses: [],
    isAcademyEligible: false,
    isMember: false,
    membershipEndDate: null,
    upcomingTournaments: [],
    upcomingCamps: [],
    upcomingAfterschool: [],
    activePrivateClassEnrollments: [],
    nextScheduleId: null,
    classWeek: { label: 'Nov 9 – Nov 15', days: [] },
  };

  test('a literal without makeupClasses does not compile; with makeupClasses: [] it does', () => {
    // @ts-expect-error makeupClasses is required on PortalStudent
    const missing: PortalStudent = { ...base, nextSession: null };
    // @ts-expect-error nextSession is required on PortalStudent
    const noNext: PortalStudent = { ...base, makeupClasses: [] };
    const present: PortalStudent = { ...base, makeupClasses: [], nextSession: null };
    expect(missing).toBeDefined();
    expect(noNext).toBeDefined();
    expect(present.makeupClasses).toEqual([]);
    expect(present.nextSession).toBeNull();
  });

  test('nextSession accepts a NextSession literal', () => {
    const next: NextSession = {
      kind: 'makeup',
      sessionId: 'session-1',
      scheduleId: 'schedule-1',
      date: '2026-11-12',
      startsAt: '2026-11-12T22:00:00.000Z',
      endsAt: '2026-11-12T23:00:00.000Z',
      isToday: false,
      label: 'Thursday',
      timeLabel: '5:00 PM – 6:00 PM ET',
      levelName: 'Level 1',
      coachName: 'Alex Coach',
      locationName: 'Online',
      isOnline: true,
      classLink: null,
      forLabel: 'Sun, Nov 8',
    };
    const student: PortalStudent = { ...base, makeupClasses: [], nextSession: next };
    expect(student.nextSession?.kind).toBe('makeup');
    expect(student.nextSession?.forLabel).toBe('Sun, Nov 8');
  });
  test.each(['regular', 'makeup', 'trial'] as const)('a NextSession of kind %s is assignable', (kind) => {
    const next: NextSession = {
      kind,
      sessionId: `session-${kind}`,
      scheduleId: 'schedule-1',
      date: '2026-11-12',
      startsAt: '2026-11-12T22:00:00.000Z',
      endsAt: '2026-11-12T23:00:00.000Z',
      isToday: false,
      label: 'Thursday',
      timeLabel: '5:00 PM – 6:00 PM ET',
      levelName: 'Level 1',
      coachName: 'Alex Coach',
      locationName: 'Online',
      isOnline: true,
      classLink: null,
      forLabel: kind === 'makeup' ? 'Sun, Nov 8' : '',
    };
    expect(next.kind).toBe(kind);
  });
});
