import { promises as fs } from "node:fs";
import {
  planRetentionActions,
  processDateDir,
  runLogRetention,
} from "../../../src/jobs/logRetention.job";
import { LogHelper } from "../../../src/helper/log.helper";

jest.mock("node:fs", () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock("node:zlib", () => ({
  gzip: jest.fn((_input: unknown, cb: (err: null, result: Buffer) => void) =>
    cb(null, Buffer.from("compressed")),
  ),
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
  readFile: jest.Mock;
  writeFile: jest.Mock;
  unlink: jest.Mock;
};

const NOW = new Date("2026-08-15T00:00:00.000Z");

const RULES = {
  request: { compressAfterDays: 7, deleteAfterDays: 30 },
  info: { compressAfterDays: 14, deleteAfterDays: 60 },
  warning: { compressAfterDays: 30, deleteAfterDays: 180 },
  error: { compressAfterDays: 30, deleteAfterDays: 365 },
  critical: { compressAfterDays: 90, deleteAfterDays: 730 },
} as const;

describe("planRetentionActions", () => {
  it("marks .log files whose directory is old enough for compression", () => {
    // 8 days old: past request's compressAfterDays (7).
    const plan = planRetentionActions(["request.log"], 8, RULES);
    expect(plan.toCompress).toEqual(["request.log"]);
  });

  it("leaves .log files in a recent-enough directory alone", () => {
    const plan = planRetentionActions(["request.log"], 1, RULES);
    expect(plan.toCompress).toEqual([]);
  });

  it("marks .log.gz files whose directory is old enough for deletion", () => {
    const plan = planRetentionActions(["request.log.gz"], 30, RULES);
    expect(plan.toDelete).toEqual(["request.log.gz"]);
  });

  it("leaves .log.gz files in a recent-enough directory alone", () => {
    const plan = planRetentionActions(["request.log.gz"], 10, RULES);
    expect(plan.toDelete).toEqual([]);
  });

  it("applies the rule matching each file's own severity", () => {
    // 20 days old: past info's compressAfterDays (14) but not warning's (30).
    const plan = planRetentionActions(["info.log", "warning.log"], 20, RULES);
    expect(plan.toCompress).toEqual(["info.log"]);
  });

  it("ignores files that don't match the expected naming pattern", () => {
    const plan = planRetentionActions(
      ["readme.txt", "info.log.bak", ".gitkeep"],
      100,
      RULES,
    );
    expect(plan.toCompress).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });
});

describe("processDateDir", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("compresses old .log files and removes the original", async () => {
    fsMock.readdir.mockResolvedValue(["info.log"]);
    fsMock.readFile.mockResolvedValue(Buffer.from("log contents"));

    await processDateDir("/logs/2026-08-01", 14, RULES);

    expect(fsMock.readFile).toHaveBeenCalledWith(
      expect.stringContaining("info.log"),
    );
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("info.log.gz"),
      expect.any(Buffer),
    );
    expect(fsMock.unlink).toHaveBeenCalledWith(
      expect.stringContaining("info.log"),
    );
  });

  it("deletes old .log.gz files", async () => {
    fsMock.readdir.mockResolvedValue(["info.log.gz"]);

    await processDateDir("/logs/2026-01-01", 60, RULES);

    expect(fsMock.unlink).toHaveBeenCalledWith(
      expect.stringContaining("info.log.gz"),
    );
    expect(fsMock.readFile).not.toHaveBeenCalled();
  });

  it("does nothing and does not throw when the directory doesn't exist yet", async () => {
    const enoent = Object.assign(new Error("no such file"), {
      code: "ENOENT",
    });
    fsMock.readdir.mockRejectedValue(enoent);

    await expect(
      processDateDir("/logs/2026-08-15", 0, RULES),
    ).resolves.toBeUndefined();
    expect(fsMock.unlink).not.toHaveBeenCalled();
  });
});

describe("runLogRetention", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fsMock.readdir.mockResolvedValue([]);
    (LogHelper.getBaseLogDir as jest.Mock).mockResolvedValue("/logs");
  });

  it("processes every <date>/ subdirectory of the log dir", async () => {
    fsMock.readdir.mockImplementation((dir: string) =>
      Promise.resolve(dir === "/logs" ? ["2026-08-01", "2026-08-14", "not-a-date"] : []),
    );

    await runLogRetention(NOW);

    const dirsProcessed = fsMock.readdir.mock.calls.map(([dir]) => dir);
    expect(dirsProcessed).toEqual(
      expect.arrayContaining(["/logs/2026-08-01", "/logs/2026-08-14"]),
    );
    expect(dirsProcessed).not.toContain("/logs/not-a-date");
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
