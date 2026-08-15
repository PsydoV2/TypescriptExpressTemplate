/**
 * Central place for tunable constants that would otherwise be scattered
 * as magic numbers/strings across the codebase. Add to this as the
 * project grows — resist inlining a new "magic number" elsewhere once
 * this file exists.
 */
export const AppConfig = {
  cron: {
    logRetention: "0 4 * * *", // daily at 04:00
  },
  logRetention: {
    // per LogSeverity subdirectory: compress .log files older than N
    // days, delete already-compressed .log.gz files older than M days
    rules: {
      request: { compressAfterDays: 7, deleteAfterDays: 30 },
      info: { compressAfterDays: 14, deleteAfterDays: 60 },
      warning: { compressAfterDays: 30, deleteAfterDays: 180 },
      error: { compressAfterDays: 30, deleteAfterDays: 365 },
      critical: { compressAfterDays: 90, deleteAfterDays: 730 },
    },
  },
} as const;
