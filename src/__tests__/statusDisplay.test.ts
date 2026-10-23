import {
  gameOutcomeDisplay,
  homeworkStatusDisplay,
  joinStateDisplay,
  missionStatusDisplay,
  positionStatusDisplay,
  roundStatusDisplay,
  toneColors,
} from '../statusDisplay';
import type { Tone } from '../statusDisplay';
import { tokens } from '../tokens';

describe('status display maps', () => {
  it('maps every homework status', () => {
    expect(homeworkStatusDisplay).toEqual({
      not_started: { label: 'Not started', tone: 'neutral' },
      in_progress: { label: 'In progress', tone: 'warning' },
      completed: { label: 'Completed', tone: 'success' },
    });
  });

  it('maps every mission status', () => {
    expect(missionStatusDisplay).toEqual({
      not_started: { label: 'New', tone: 'info' },
      in_progress: { label: 'In progress', tone: 'warning' },
      succeeded: { label: 'Won ✓', tone: 'success' },
      failed: { label: 'Try again', tone: 'orange' },
      attempts_exhausted: { label: 'No attempts left', tone: 'neutral' },
    });
  });

  it('maps every position status', () => {
    expect(positionStatusDisplay.correct).toEqual({ label: '✓', tone: 'success' });
    expect(positionStatusDisplay.incorrect).toEqual({ label: '✕', tone: 'danger' });
    expect(positionStatusDisplay.not_attempted).toEqual({ label: '–', tone: 'neutral' });
  });

  it('maps every game outcome', () => {
    expect(gameOutcomeDisplay).toEqual({
      win: { label: 'W', tone: 'success' },
      loss: { label: 'L', tone: 'danger' },
      draw: { label: 'D', tone: 'neutral' },
    });
  });

  it('maps every tournament join state', () => {
    expect(joinStateDisplay).toEqual({
      upcoming: { label: 'Upcoming', tone: 'info' },
      open: { label: 'Open', tone: 'success' },
      in_round: { label: '● In round', tone: 'orange' },
      between_rounds: { label: '● Between rounds', tone: 'orange' },
      done: { label: 'Finished', tone: 'neutral' },
    });
  });
});

describe('toneColors', () => {
  it('returns token colours for every tone', () => {
    const expected: Record<Tone, { bg: string; fg: string }> = {
      neutral: { bg: tokens.color.borderSoft, fg: tokens.color.textSoft },
      info: { bg: tokens.color.blueSoft, fg: tokens.color.blue },
      warning: { bg: tokens.color.warningSoft, fg: tokens.color.warningFg },
      success: { bg: tokens.color.successSoft, fg: tokens.color.successFg },
      danger: { bg: tokens.color.dangerSoft, fg: tokens.color.danger },
      orange: { bg: tokens.color.orangeSoft, fg: tokens.color.orangeHover },
    };
    for (const tone of Object.keys(expected) as Tone[]) {
      expect(toneColors(tone)).toEqual(expected[tone]);
    }
  });
  it('roundStatusDisplay maps every RoundStatus', () => {
    expect(roundStatusDisplay).toEqual({
      played: { label: 'Played', tone: 'success' },
      in_progress: { label: 'In progress', tone: 'orange' },
      upcoming: { label: 'Upcoming', tone: 'neutral' },
    });
  });
});
