import { promises as fs } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import cron from "node-cron";
import { AppConfig } from "../config/app.config";
import { LogHelper, LogSeverity } from "../helper/log.helper";

const gzip = promisify(zlib.gzip);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LOG_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.log$/;
const GZ_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.log\.gz$/;

type RetentionRule = { compressAfterDays: number; deleteAfterDays: number };

interface RetentionPlan {
  toCompress: string[];
  toDelete: string[];
}

function ageInDays(isoDate: string, now: Date): number {
  const fileDate = new Date(`${isoDate}T00:00:00.000Z`);
  return (now.getTime() - fileDate.getTime()) / MS_PER_DAY;
}

/**
 * Pure planning step: given the filenames present in a severity directory,
 * decides which `.log` files are old enough to compress and which
 * `.log.gz` files are old enough to delete. Does no filesystem I/O, so it's
 * trivial to unit test.
 */
export function planRetentionActions(
  fileNames: string[],
  rule: RetentionRule,
  now: Date = new Date(),
): RetentionPlan {
  const toCompress: string[] = [];
  const toDelete: string[] = [];

  for (const fileName of fileNames) {
    const logMatch = LOG_FILE_PATTERN.exec(fileName);
    if (logMatch) {
      const [, isoDate] = logMatch;
      if (isoDate && ageInDays(isoDate, now) >= rule.compressAfterDays) {
        toCompress.push(fileName);
      }
      continue;
    }

    const gzMatch = GZ_FILE_PATTERN.exec(fileName);
    if (gzMatch) {
      const [, isoDate] = gzMatch;
      if (isoDate && ageInDays(isoDate, now) >= rule.deleteAfterDays) {
        toDelete.push(fileName);
      }
    }
  }

  return { toCompress, toDelete };
}

async function compressFile(dir: string, fileName: string): Promise<void> {
  const filePath = path.join(dir, fileName);
  const content = await fs.readFile(filePath);
  const compressed = await gzip(content);
  await fs.writeFile(`${filePath}.gz`, compressed);
  await fs.unlink(filePath);
}

/** Applies the retention rule to a single severity subdirectory. */
export async function processSeverityDir(
  dir: string,
  rule: RetentionRule,
  now: Date = new Date(),
): Promise<void> {
  let fileNames: string[];
  try {
    fileNames = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return; // Nothing has been logged at this severity yet.
    }
    throw err;
  }

  const { toCompress, toDelete } = planRetentionActions(fileNames, rule, now);

  for (const fileName of toCompress) {
    await compressFile(dir, fileName);
  }
  for (const fileName of toDelete) {
    await fs.unlink(path.join(dir, fileName));
  }
}

// Guards against a run still being in progress when the next tick fires
// (e.g. a very large backlog on first run).
let isRunning = false;

/** Runs one retention pass across every LogSeverity subdirectory. */
export async function runLogRetention(now: Date = new Date()): Promise<void> {
  if (isRunning) {
    console.warn(
      "⚠️ Log retention run skipped — previous run is still in progress.",
    );
    return;
  }

  isRunning = true;
  try {
    const baseDir = await LogHelper.getBaseLogDir();
    const rules = AppConfig.logRetention.rules;

    for (const severity of Object.values(LogSeverity)) {
      const severityDir = path.join(baseDir, severity);
      await processSeverityDir(severityDir, rules[severity], now);
    }
  } catch (err) {
    await LogHelper.logError("logRetention", err, LogSeverity.ERROR);
  } finally {
    isRunning = false;
  }
}

/** Schedules the nightly log-retention job (see AppConfig.cron.logRetention). */
export async function scheduleLogRetention(): Promise<void> {
  cron.schedule(AppConfig.cron.logRetention, () => {
    void runLogRetention();
  });
}
