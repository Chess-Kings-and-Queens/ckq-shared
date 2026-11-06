import { QUIZ_MOVE_RESULT_STATUSES, QUIZ_VERDICTS } from '../types/liveboard';

describe('liveboard quiz vocabularies', () => {
  test('QUIZ_VERDICTS holds the four engine-judge verdicts in order', () => {
    expect([...QUIZ_VERDICTS]).toEqual(['better', 'equivalent', 'acceptable', 'wrong']);
  });

  test('QUIZ_MOVE_RESULT_STATUSES holds the four move-result statuses in order', () => {
    expect([...QUIZ_MOVE_RESULT_STATUSES]).toEqual(['correct', 'alternate', 'acceptable', 'wrong']);
  });
});
