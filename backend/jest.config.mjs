// jest.config.mjs
export default {
  preset: 'ts-jest/presets/default-esm',
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
