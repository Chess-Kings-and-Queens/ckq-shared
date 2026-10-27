import { trailRuleText } from '../index';
import type { TrailCategoryKey, TrailRules } from '../index';

const RULES: TrailRules = {
  summitPoints: 1000,
  attendancePerClass: 10,
  homeworkPerPositionMax: 3,
  missionSolved: 15,
  otbTournament: 30,
  otbTournamentsPerMonthMax: 3,
  otbRatingGainBonus: 15,
  onlineTournamentPlayed: 15,
  onlineTournamentsPerMonthMax: 4,
  onlineTournamentWinBonus: 25,
  onlineWinMinPlayers: 4,
  workbookPerPositionMax: 1,
  quizPointsPerSessionMax: 20,
  homeworkPerMonthMax: 150,
  categoryMaxPct: 40,
  categoryMax: 400,
};

const KEYS: TrailCategoryKey[] = [
  'attendance',
  'classQuiz',
  'homework',
  'missions',
  'otbTournaments',
  'onlineTournaments',
  'workbook',
];

describe('trailRuleText', () => {
  it.each<[TrailCategoryKey, string]>([
    ['attendance', '10 points for every class attended: group, private and make-up.'],
    [
      'classQuiz',
      "Up to 20 points per class: the share of that class's quiz points earned, times 20. An unanswered quiz counts as 0.",
    ],
    ['homework', 'Up to 3 points per position, by best score. At most 150 points a month.'],
    ['missions', '15 points for each different mission solved (not practice, not in class).'],
    [
      'otbTournaments',
      '30 points per USCF-rated tournament, plus 15 when the rating went up or it gave a first rating. At most 3 tournaments a month.',
    ],
    [
      'onlineTournaments',
      '15 points per academy online tournament played (at most 4 a month), plus 25 for winning one with at least 4 players.',
    ],
    ['workbook', 'Up to 1 point per position, by best score.'],
  ])('%s renders its sentence from the rules', (key, expected) => {
    expect(trailRuleText(key, RULES)).toBe(expected);
  });

  it('pluralises workbook points', () => {
    expect(trailRuleText('workbook', { ...RULES, workbookPerPositionMax: 2 })).toBe(
      'Up to 2 points per position, by best score.'
    );
  });

  it('returns non-empty text for every category key', () => {
    for (const key of KEYS) expect(trailRuleText(key, RULES).length).toBeGreaterThan(0);
  });

  it('interpolates changed rules instead of hard-coding numbers', () => {
    expect(trailRuleText('attendance', { ...RULES, attendancePerClass: 12 })).toMatch(/^12 points/);
  });
});
