/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  // pnpm symlinks + @prisma/client's conditional exports confuse jest-resolve; pin it explicitly.
  moduleNameMapper: { '^@prisma/client$': require.resolve('@prisma/client') },
};
