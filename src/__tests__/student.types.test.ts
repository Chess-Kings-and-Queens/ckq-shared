import type {
  NextSession,
  PortalMakeupClass,
  PortalStudent,
  StudentClass,
  StudentClassNext,
  SubscriptionCalculation,
} from '../types/student';

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
  const base: Omit<PortalStudent, 'makeupClasses' | 'nextSession' | 'classes'> = {
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
    const missing: PortalStudent = { ...base, nextSession: null, classes: [] };
    // @ts-expect-error nextSession is required on PortalStudent
    const noNext: PortalStudent = { ...base, makeupClasses: [], classes: [] };
    const present: PortalStudent = { ...base, makeupClasses: [], nextSession: null, classes: [] };
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
    const student: PortalStudent = { ...base, makeupClasses: [], nextSession: next, classes: [] };
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

describe('PortalStudent.classes', () => {
  const base: Omit<PortalStudent, 'classes'> = {
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
    makeupClasses: [],
    nextSession: null,
  };

  const makeNext = (kind: StudentClassNext['kind']): StudentClassNext => ({
    kind,
    sessionId: `session-${kind}`,
    date: '2026-11-24',
    startsAt: '2026-11-24T22:00:00.000Z',
    endsAt: '2026-11-24T23:00:00.000Z',
    isToday: false,
    label: 'Tue',
    timeLabel: '5:00 PM – 6:00 PM ET',
    dateLabel: 'Tue, Nov 24 · 5:00 PM ET',
    coachName: 'Alex Coach',
    locationName: 'Online',
    isOnline: true,
    classLink: kind === 'private' ? null : 'https://zoom.example/j/1',
  });

  const makeClass = (kind: StudentClass['kind'], next: StudentClassNext | null): StudentClass => ({
    id: `${kind}-1`,
    kind,
    title: kind === 'private' ? 'Private Class' : 'Pawn 1',
    scheduleLabel: kind === 'trial' ? '' : 'Tuesdays · 5:00 PM – 6:00 PM ET',
    coachName: 'Alex Coach',
    locationName: 'Online',
    isOnline: true,
    isPremium: false,
    premiumType: null,
    startedAt: kind === 'group' ? '2026-11-15T12:00:00.000Z' : null,
    next,
    isNext: next !== null,
  });

  test.each(['group', 'private', 'trial'] as const)('a StudentClass of kind %s is assignable', (kind) => {
    const row = makeClass(kind, makeNext(kind === 'group' ? 'regular' : kind));
    expect(row.kind).toBe(kind);
  });

  test.each(['regular', 'makeup', 'trial', 'private'] as const)('a StudentClassNext of kind %s is assignable', (kind) => {
    const next = makeNext(kind);
    expect(next.kind).toBe(kind);
  });

  test('a StudentClass with next: null is assignable', () => {
    const row = makeClass('group', null);
    expect(row.next).toBeNull();
    expect(row.isNext).toBe(false);
  });

  test('a PortalStudent carries classes and a case reads next.dateLabel', () => {
    const student: PortalStudent = { ...base, classes: [makeClass('private', makeNext('private'))] };
    expect(student.classes[0].next?.dateLabel).toBe('Tue, Nov 24 · 5:00 PM ET');
  });

  test('a PortalStudent literal without classes does not compile', () => {
    // @ts-expect-error classes is required on PortalStudent
    const missing: PortalStudent = { ...base };
    expect(missing).toBeDefined();
  });
});
