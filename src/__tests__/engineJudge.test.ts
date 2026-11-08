import {
  JUDGE_VERDICTS,
  CREDITED_VERDICTS,
  isCreditedVerdict,
  judgedScore,
  JUDGE_VERDICT_MESSAGES,
  ACCEPTABLE_CREDIT,
} from '../engineJudge';

describe('JUDGE_VERDICTS / CREDITED_VERDICTS', () => {
  test('JUDGE_VERDICTS has the six names in order', () => {
    expect([...JUDGE_VERDICTS]).toEqual(['exact', 'better', 'equivalent', 'acceptable', 'wrong', 'illegal']);
  });

  test('CREDITED_VERDICTS is the four credited names', () => {
    expect([...CREDITED_VERDICTS]).toEqual(['exact', 'better', 'equivalent', 'acceptable']);
  });
});

describe('isCreditedVerdict', () => {
  test.each(['exact', 'better', 'equivalent', 'acceptable'])('%s is credited', (verdict) => {
    expect(isCreditedVerdict(verdict)).toBe(true);
  });

  test.each(['wrong', 'illegal', 'foo', '', null, undefined])('%p is not credited', (verdict) => {
    expect(isCreditedVerdict(verdict)).toBe(false);
  });
});

describe('judgedScore', () => {
  test.each(['exact', 'better', 'equivalent'])('%s scores 100 whatever the partial credit', (verdict) => {
    expect(judgedScore(verdict, 0)).toBe(100);
    expect(judgedScore(verdict, 67)).toBe(100);
  });

  test('acceptable scores ACCEPTABLE_CREDIT (50) when the partial credit is lower', () => {
    expect(ACCEPTABLE_CREDIT).toBe(50);
    expect(judgedScore('acceptable', 0)).toBe(50);
  });

  test('acceptable never scores below the strict partial credit', () => {
    expect(judgedScore('acceptable', 67)).toBe(67);
  });

  test.each(['wrong', 'illegal', 'foo', null, undefined])('%p is not credited, so the score is null', (verdict) => {
    expect(judgedScore(verdict, 40)).toBeNull();
  });
});

describe('JUDGE_VERDICT_MESSAGES', () => {
  test('has the liveboard wording for better, equivalent and acceptable', () => {
    expect(JUDGE_VERDICT_MESSAGES.better).toBe('Even better than the given solution!');
    expect(JUDGE_VERDICT_MESSAGES.equivalent).toBe('Alternate solution, equally good!');
    expect(JUDGE_VERDICT_MESSAGES.acceptable).toBe('Acceptable, but you can find better');
  });

  test('exact has no message (it is the answer)', () => {
    expect(JUDGE_VERDICT_MESSAGES.exact).toBeUndefined();
  });
});

describe('judge constants are frozen at runtime (D23)', () => {
  test('JUDGE_VERDICTS is frozen', () => {
    expect(Object.isFrozen(JUDGE_VERDICTS)).toBe(true);
  });

  test('CREDITED_VERDICTS is frozen', () => {
    expect(Object.isFrozen(CREDITED_VERDICTS)).toBe(true);
  });

  test('JUDGE_VERDICT_MESSAGES is frozen', () => {
    expect(Object.isFrozen(JUDGE_VERDICT_MESSAGES)).toBe(true);
  });
});
