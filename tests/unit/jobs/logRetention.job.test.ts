import { promises as fs } from "node:fs";
import * as tar from "tar";
import {
  ARCHIVE_DIR_NAME,
  archiveDateDir,
  planRetentionActions,
  runLogRetention,
} from "../../../src/jobs/logRetention.job";
import { LogHelper } from "../../../src/helper/log.helper";

jest.mock("node:fs", () => ({
  promises: {
    readdir: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock("tar", () => ({
  create: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/helper/log.helper", () => {
  const actual = jest.requireActual("../../../src/helper/log.helper");
  return {
    ...actual,
    LogHelper: { getBaseLogDir: jest.fn(), logError: jest.fn() },
  };
});

const fsMock = fs as unknown as {
  readdir: jest.Mock;
  mkdir: jest.Mock;
  rm: jest.Mock;
  unlink: jest.Mock;
};
const tarMock = tar as unknown as { create: jest.Mock };

const NOW = new Date("2026-08-15T00:00:00.000Z");
const RULE = { compressAfterDays: 14, deleteAfterDays: 365 };

describe("planRetentionActions", () => {
  it("marks <date>/ directories at least compressAfterDays old for archiving", () => {
    // 2026-08-15 minus 2026-08-01 = 14 days old.
    const plan = planRetentionActions(["2026-08-01"], [], RULE, NOW);
    expect(plan.toArchive).toEqual(["2026-08-01"]);
  });

  it("leaves recent <date>/ directories alone", () => {
    const plan = planRetentionActions(["2026-08-10"], [], RULE, NOW);
    expect(plan.toArchive).toEqual([]);
  });

  it("ignores directory names that aren't a date", () => {
    const plan = planRetentionActions(["Archive", "not-a-date"], [], RULE, NOW);
    expect(plan.toArchive).toEqual([]);
  });

  it("marks <date>.gz archives at least deleteAfterDays old for deletion", () => {
    // 2026-08-15 minus 2025-08-15 = 365 days old.
    const plan = planRetentionActions([], ["2025-08-15.gz"], RULE, NOW);
    expect(plan.toDelete).toEqual(["2025-08-15.gz"]);
  });

  it("leaves recent archives alone", () => {
    const plan = planRetentionActions([], ["2026-08-01.gz"], RULE, NOW);
    expect(plan.toDelete).toEqual([]);
  });

  it("ignores files that don't match the <date>.gz naming pattern", () => {
    const plan = planRetentionActions(
      [],
      ["readme.txt", "2026-08-01.gz.bak", ".gitkeep"],
      RULE,
      NOW,
    );
    expect(plan.toDelete).toEqual([]);
  });
});

describe("archiveDateDir", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tars the date directory into Archive/<date>.gz and removes the original", async () => {
    await archiveDateDir("/logs", "2026-08-01");

    expect(fsMock.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(ARCHIVE_DIR_NAME),
      { recursive: true },
    );
    expect(tarMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gzip: true,
        cwd: "/logs",
        file: expect.stringContaining(`${ARCHIVE_DIR_NAME}/2026-08-01.gz`),
      }),
      ["2026-08-01"],
    );
    expect(fsMock.rm).toHaveBeenCalledWith(
      expect.stringContaining("2026-08-01"),
      { recursive: true, force: true },
    );
  });
});

describe("runLogRetention", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fsMock.readdir.mockResolvedValue([]);
    (LogHelper.getBaseLogDir as jest.Mock).mockResolvedValue("/logs");
  });

  it("archives old date directories and deletes old archives", async () => {
    fsMock.readdir.mockImplementation((dir: string) => {
      if (dir === "/logs") {
        return Promise.resolve(["2026-08-01", "2026-08-14", "not-a-date"]);
      }
      if (dir === "/logs/Archive") {
        return Promise.resolve(["2025-01-01.gz"]);
      }
      return Promise.resolve([]);
    });

    await runLogRetention(NOW);

    // Only 2026-08-01 is >= 14 days old.
    expect(tarMock.create).toHaveBeenCalledTimes(1);
    expect(tarMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: "/logs" }),
      ["2026-08-01"],
    );
    expect(fsMock.unlink).toHaveBeenCalledWith(
      expect.stringContaining("2025-01-01.gz"),
    );
  });

  it("does nothing when neither the log dir nor Archive/ exist yet", async () => {
    const enoent = Object.assign(new Error("no such file"), {
      code: "ENOENT",
    });
    fsMock.readdir.mockRejectedValue(enoent);

    await expect(runLogRetention(NOW)).resolves.toBeUndefined();
    expect(tarMock.create).not.toHaveBeenCalled();
    expect(fsMock.unlink).not.toHaveBeenCalled();
  });

  it("skips a run if the previous one is still in progress", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    // getBaseLogDir is the very first thing runLogRetention awaits, so
    // controlling it lets us hold the first run "in progress" without any
    // microtask-ordering games.
    let releaseFirstRun: () => void = () => undefined;
    (LogHelper.getBaseLogDir as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseFirstRun = () => resolve("/logs");
        }),
    );

    const firstRun = runLogRetention(NOW);
    // isRunning is set synchronously before the first await, so this second
    // call is skipped immediately without touching the filesystem.
    const secondRun = runLogRetention(NOW);

    releaseFirstRun();
    await Promise.all([firstRun, secondRun]);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("skipped"));
  });

  it("logs an ERROR via LogHelper if reading the base log dir fails unexpectedly", async () => {
    fsMock.readdir.mockRejectedValue(new Error("disk error"));

    await runLogRetention(NOW);

    expect(LogHelper.logError).toHaveBeenCalledWith(
      "logRetention",
      expect.any(Error),
      "error",
    );
  });
});
