describe('jest timezone pin', () => {
  it('runs every test in UTC', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
    expect(new Date(2026, 6, 1).getTimezoneOffset()).toBe(0);
  });
});
