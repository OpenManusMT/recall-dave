// Unit tests for the iPhone app's own glue code (the domain logic itself is
// tested in packages/core with Vitest). Uses Expo's jest preset for iOS.
module.exports = {
  preset: 'jest-expo/ios',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  // Shared packages are linked from ../../packages; resolve their bare imports
  // (e.g. "zod") from this app's node_modules, like metro.config.js does.
  modulePaths: ['<rootDir>/node_modules'],
};
