import type { PortalMakeupClass, PortalStudent, SubscriptionCalculation } from '../types/student';

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
      isNext: true,
      levelName: 'Level 1',
      coachName: 'Alex Coach',
      locationName: 'Online',
      isOnline: true,
      classLink: null,
      forLabel: 'Sun, Nov 8',
    };
    expect(makeup.isNext).toBe(true);
    expect(makeup.classLink).toBeNull();
    expect(makeup.forLabel).toBe('Sun, Nov 8');
  });
});

describe('PortalStudent.makeupClasses', () => {
  const base: Omit<PortalStudent, 'makeupClasses'> = {
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
    const missing: PortalStudent = { ...base };
    const present: PortalStudent = { ...base, makeupClasses: [] };
    expect(missing).toBeDefined();
    expect(present.makeupClasses).toEqual([]);
  });
});
