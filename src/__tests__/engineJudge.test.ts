import {
  JUDGE_VERDICTS,
  CREDITED_VERDICTS,
  isCreditedVerdict,
  JUDGE_VERDICT_MESSAGES,
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
