import { tokens } from './tokens';
import type { HomeworkPositionStatus, HomeworkStatus } from './types/homework';
import type { Mission } from './types/missions';
import type { GameTimelineRow } from './types/studentGames';
import type { JoinState, RoundStatus } from './types/tournamentResults';

// ── Status → label + tone ──────────────────────────────────────────────────────
//
// One vocabulary for every status chip in the student app. Pure maps typed
// against the shared enum types, so a new enum value fails `tsc` until it has a
// label. The backend owns the status values; these only name and colour them.

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'orange';

export interface StatusDisplay {
  label: string;
  tone: Tone;
}

export function toneColors(tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'neutral':
      return { bg: tokens.color.borderSoft, fg: tokens.color.textSoft };
    case 'info':
      return { bg: tokens.color.blueSoft, fg: tokens.color.blue };
    case 'warning':
      return { bg: tokens.color.warningSoft, fg: tokens.color.warningFg };
    case 'success':
      return { bg: tokens.color.successSoft, fg: tokens.color.successFg };
    case 'danger':
      return { bg: tokens.color.dangerSoft, fg: tokens.color.danger };
    case 'orange':
      return { bg: tokens.color.orangeSoft, fg: tokens.color.orangeHover };
  }
}

type PositionStatus = HomeworkPositionStatus;
type GameOutcome = NonNullable<GameTimelineRow['outcome']>;

export const homeworkStatusDisplay: Record<HomeworkStatus, StatusDisplay> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

export const missionStatusDisplay: Record<Mission['status'], StatusDisplay> = {
  not_started: { label: 'New', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'warning' },
  succeeded: { label: 'Won ✓', tone: 'success' },
  failed: { label: 'Try again', tone: 'orange' },
  attempts_exhausted: { label: 'No attempts left', tone: 'neutral' },
};

export const positionStatusDisplay: Record<PositionStatus, StatusDisplay> = {
  correct: { label: '✓', tone: 'success' },
  incorrect: { label: '✕', tone: 'danger' },
  not_attempted: { label: '–', tone: 'neutral' },
};

export const gameOutcomeDisplay: Record<GameOutcome, StatusDisplay> = {
  win: { label: 'W', tone: 'success' },
  loss: { label: 'L', tone: 'danger' },
  draw: { label: 'D', tone: 'neutral' },
};

export const joinStateDisplay: Record<JoinState, StatusDisplay> = {
  upcoming: { label: 'Upcoming', tone: 'info' },
  open: { label: 'Open', tone: 'success' },
  in_round: { label: '● In round', tone: 'orange' },
  between_rounds: { label: '● Between rounds', tone: 'orange' },
  done: { label: 'Finished', tone: 'neutral' },
};

export const roundStatusDisplay: Record<RoundStatus, StatusDisplay> = {
  played: { label: 'Played', tone: 'success' },
  in_progress: { label: 'In progress', tone: 'orange' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
};
