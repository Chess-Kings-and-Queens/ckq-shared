import type { TrailCategoryKey, TrailRules } from './types/trail';

// One sentence per category key. Every number comes from config.rules (frontend-005, ADR backend-030).
// Moved from website2.0 Trail/ScoringModal.tsx RULE_TEXT (2026-10-27).
const RULE_TEXT: Record<TrailCategoryKey, (r: TrailRules) => string> = {
  attendance: (r) => `${r.attendancePerClass} points for every class attended: group, private and make-up.`,
  classQuiz: (r) =>
    `Up to ${r.quizPointsPerSessionMax} points per class: the share of that class's quiz points earned, times ${r.quizPointsPerSessionMax}. An unanswered quiz counts as 0.`,
  homework: (r) =>
    `Up to ${r.homeworkPerPositionMax} points per position, by best score. At most ${r.homeworkPerMonthMax} points a month.`,
  missions: (r) => `${r.missionSolved} points for each different mission solved (not practice, not in class).`,
  otbTournaments: (r) =>
    `${r.otbTournament} points per USCF-rated tournament, plus ${r.otbRatingGainBonus} when the rating went up or it gave a first rating. At most ${r.otbTournamentsPerMonthMax} tournaments a month.`,
  onlineTournaments: (r) =>
    `${r.onlineTournamentPlayed} points per academy online tournament played (at most ${r.onlineTournamentsPerMonthMax} a month), plus ${r.onlineTournamentWinBonus} for winning one with at least ${r.onlineWinMinPlayers} players.`,
  workbook: (r) => `Up to ${r.workbookPerPositionMax} point${r.workbookPerPositionMax === 1 ? '' : 's'} per position, by best score.`,
};

export function trailRuleText(key: TrailCategoryKey, rules: TrailRules): string {
  return RULE_TEXT[key](rules);
}
