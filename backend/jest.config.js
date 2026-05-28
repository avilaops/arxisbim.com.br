// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
