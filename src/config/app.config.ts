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
    // Applies to the log dir as a whole (all severities share one <date>/
    // directory, so they archive and expire together): once a <date>/
    // directory is at least `compressAfterDays` old, it's packed into
    // logs/Archive/<date>.gz and removed; once an archive is at least
    // `deleteAfterDays` old, it's deleted.
    rule: { compressAfterDays: 14, deleteAfterDays: 365 },
  },
} as const;
