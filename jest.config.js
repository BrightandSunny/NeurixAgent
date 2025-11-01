/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'tests/codex\\.smoke\\.test\\.ts',
    'tests/at-codex-001\\.spec\\.ts',
    'tests/at-codex-002\\.spec\\.ts'
  ],
  // Move ts-jest options into transform (recommended style)
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
        diagnostics: { warnOnly: true }
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  clearMocks: true,
  verbose: false,
  testTimeout: 30000
};
