module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  // Set required env vars before any module (incl. src/config/env.ts) loads.
  setupFiles: ["<rootDir>/tests/setup.env.ts"],
};