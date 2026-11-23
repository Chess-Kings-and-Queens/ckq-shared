// Every test runs in UTC on every machine, as on the CI runners. Set here, before Jest
// starts its workers, which inherit it (docs/TESTING_STRATEGY.md § Test Isolation Rules).
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  coverageProvider: 'v8',
};
