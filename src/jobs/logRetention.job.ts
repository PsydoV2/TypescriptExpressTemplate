import { promises as fs } from "node:fs";
import path from "node:path";
import * as tar from "tar";
import cron from "node-cron";
import { AppConfig } from "../config/app.config";
import { LogHelper, LogSeverity } from "../helper/log.helper";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DATE_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ARCHIVE_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.gz$/;

/** Subdirectory (of the base log dir) that compressed day-archives move into. */
export const ARCHIVE_DIR_NAME = "Archive";

export type RetentionRule = { compressAfterDays: number; deleteAfterDays: number };

interface RetentionPlan {
  toArchive: string[];
  toDelete: string[];
}

function ageInDays(isoDate: string, now: Date): number {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return (now.getTime() - date.getTime()) / MS_PER_DAY;
}

/**
 * Pure planning step: given the `<date>/` directory names present directly
 * under the log dir and the `<date>.gz` archive names present under
 * `Archive/`, decides which day directories are old enough to archive as a
 * whole and which existing archives are old enough to delete. Does no
 * filesystem I/O, so it's trivial to unit test.
 */
export function planRetentionActions(
  dateDirNames: string[],
  archiveFileNames: string[],
  rule: RetentionRule,
  now: Date = new Date(),
): RetentionPlan {
  const toArchive = dateDirNames.filter(
    (name) =>
      DATE_DIR_PATTERN.test(name) &&
      ageInDays(name, now) >= rule.compressAfterDays,
  );

  const toDelete: string[] = [];
  for (const fileName of archiveFileNames) {
    const match = ARCHIVE_FILE_PATTERN.exec(fileName);
    if (match) {
      const [, isoDate] = match;
      if (isoDate && ageInDays(isoDate, now) >= rule.deleteAfterDays) {
        toDelete.push(fileName);
      }
    }
  }

  return { toArchive, toDelete };
}

/**
 * Packs `baseDir/<dateDirName>/` (all its severity files together) into
 * `baseDir/Archive/<dateDirName>.gz` and removes the original directory.
 */
export async function archiveDateDir(
  baseDir: string,
  dateDirName: string,
): Promise<void> {
  const archiveDir = path.join(baseDir, ARCHIVE_DIR_NAME);
  await fs.mkdir(archiveDir, { recursive: true });

  const archivePath = path.join(archiveDir, `${dateDirName}.gz`);
  await tar.create({ gzip: true, cwd: baseDir, file: archivePath }, [
    dateDirName,
  ]);
  await fs.rm(path.join(baseDir, dateDirName), {
    recursive: true,
    force: true,
  });
}

async function readDirNames(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

// Guards against a run still being in progress when the next tick fires
// (e.g. a very large backlog on first run).
let isRunning = false;

/** Runs one retention pass: archives old `<date>/` directories, deletes old archives. */
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
    const rule = AppConfig.logRetention.rule;

    const dateDirNames = (await readDirNames(baseDir)).filter((name) =>
      DATE_DIR_PATTERN.test(name),
    );
    const archiveFileNames = await readDirNames(
      path.join(baseDir, ARCHIVE_DIR_NAME),
    );

    const { toArchive, toDelete } = planRetentionActions(
      dateDirNames,
      archiveFileNames,
      rule,
      now,
    );

    for (const dateDirName of toArchive) {
      await archiveDateDir(baseDir, dateDirName);
    }
    for (const fileName of toDelete) {
      await fs.unlink(path.join(baseDir, ARCHIVE_DIR_NAME, fileName));
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
