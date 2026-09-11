import { promises as fs } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import cron from "node-cron";
import { AppConfig } from "../config/app.config";
import { LogHelper, LogSeverity } from "../helper/log.helper";

const gzip = promisify(zlib.gzip);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DATE_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOG_FILE_PATTERN = /^([a-z]+)\.log$/;
const GZ_FILE_PATTERN = /^([a-z]+)\.log\.gz$/;

type RetentionRule = { compressAfterDays: number; deleteAfterDays: number };
type RetentionRules = Record<LogSeverity, RetentionRule>;

interface RetentionPlan {
  toCompress: string[];
  toDelete: string[];
}

function ageInDays(isoDate: string, now: Date): number {
  const dirDate = new Date(`${isoDate}T00:00:00.000Z`);
  return (now.getTime() - dirDate.getTime()) / MS_PER_DAY;
}

/**
 * Pure planning step: given the filenames present in a date directory
 * (`<severity>.log` / `<severity>.log.gz`) and that directory's age,
 * decides which `.log` files are old enough to compress and which
 * `.log.gz` files are old enough to delete — per the rule for the file's
 * own severity. Does no filesystem I/O, so it's trivial to unit test.
 */
export function planRetentionActions(
  fileNames: string[],
  ageDays: number,
  rules: RetentionRules,
): RetentionPlan {
  const toCompress: string[] = [];
  const toDelete: string[] = [];

  for (const fileName of fileNames) {
    const logMatch = LOG_FILE_PATTERN.exec(fileName);
    if (logMatch) {
      const severity = logMatch[1] as LogSeverity;
      const rule = rules[severity];
      if (rule && ageDays >= rule.compressAfterDays) {
        toCompress.push(fileName);
      }
      continue;
    }

    const gzMatch = GZ_FILE_PATTERN.exec(fileName);
    if (gzMatch) {
      const severity = gzMatch[1] as LogSeverity;
      const rule = rules[severity];
      if (rule && ageDays >= rule.deleteAfterDays) {
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

/** Applies the retention rules to a single `<date>/` directory. */
export async function processDateDir(
  dir: string,
  ageDays: number,
  rules: RetentionRules,
): Promise<void> {
  let fileNames: string[];
  try {
    fileNames = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return; // Nothing has been logged on this day (any more).
    }
    throw err;
  }

  const { toCompress, toDelete } = planRetentionActions(fileNames, ageDays, rules);

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

/** Runs one retention pass across every `<date>/` subdirectory of the log dir. */
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

    let entries: string[];
    try {
      entries = await fs.readdir(baseDir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        entries = [];
      } else {
        throw err;
      }
    }

    for (const entry of entries) {
      if (!DATE_DIR_PATTERN.test(entry)) continue;
      const ageDays = ageInDays(entry, now);
      await processDateDir(path.join(baseDir, entry), ageDays, rules);
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
