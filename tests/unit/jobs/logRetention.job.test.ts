import { promises as fs } from "node:fs";
import {
  planRetentionActions,
  processSeverityDir,
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

describe("planRetentionActions", () => {
  const rule = { compressAfterDays: 7, deleteAfterDays: 30 };

  it("marks .log files older than compressAfterDays for compression", () => {
    const plan = planRetentionActions(
      ["2026-08-07.log", "2026-08-08.log"],
      rule,
      NOW,
    );
    // 2026-08-07 is exactly 8 days old, 2026-08-08 is exactly 7 days old.
    expect(plan.toCompress).toEqual(["2026-08-07.log", "2026-08-08.log"]);
  });

  it("leaves recent .log files alone", () => {
    const plan = planRetentionActions(["2026-08-14.log"], rule, NOW);
    expect(plan.toCompress).toEqual([]);
  });

  it("marks .log.gz files older than deleteAfterDays for deletion", () => {
    const plan = planRetentionActions(["2026-07-16.log.gz"], rule, NOW);
    // Exactly 30 days old.
    expect(plan.toDelete).toEqual(["2026-07-16.log.gz"]);
  });

  it("leaves recent .log.gz files alone", () => {
    const plan = planRetentionActions(["2026-07-20.log.gz"], rule, NOW);
    expect(plan.toDelete).toEqual([]);
  });

  it("ignores files that don't match the expected naming pattern", () => {
    const plan = planRetentionActions(
      ["readme.txt", "2026-08-01.log.bak", ".gitkeep"],
      rule,
      NOW,
    );
    expect(plan.toCompress).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });
});

describe("processSeverityDir", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("compresses old .log files and removes the original", async () => {
    fsMock.readdir.mockResolvedValue(["2026-08-01.log"]);
    fsMock.readFile.mockResolvedValue(Buffer.from("log contents"));

    await processSeverityDir(
      "/logs/info",
      { compressAfterDays: 7, deleteAfterDays: 30 },
      NOW,
    );

    expect(fsMock.readFile).toHaveBeenCalledWith(
      expect.stringContaining("2026-08-01.log"),
    );
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("2026-08-01.log.gz"),
      expect.any(Buffer),
    );
    expect(fsMock.unlink).toHaveBeenCalledWith(
      expect.stringContaining("2026-08-01.log"),
    );
  });

  it("deletes old .log.gz files", async () => {
    fsMock.readdir.mockResolvedValue(["2026-01-01.log.gz"]);

    await processSeverityDir(
      "/logs/info",
      { compressAfterDays: 7, deleteAfterDays: 30 },
      NOW,
    );

    expect(fsMock.unlink).toHaveBeenCalledWith(
      expect.stringContaining("2026-01-01.log.gz"),
    );
    expect(fsMock.readFile).not.toHaveBeenCalled();
  });

  it("does nothing and does not throw when the directory doesn't exist yet", async () => {
    const enoent = Object.assign(new Error("no such file"), {
      code: "ENOENT",
    });
    fsMock.readdir.mockRejectedValue(enoent);

    await expect(
      processSeverityDir(
        "/logs/critical",
        { compressAfterDays: 90, deleteAfterDays: 730 },
        NOW,
      ),
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

  it("processes every LogSeverity subdirectory", async () => {
    await runLogRetention(NOW);

    const dirsProcessed = fsMock.readdir.mock.calls.map(([dir]) => dir);
    expect(dirsProcessed).toEqual(
      expect.arrayContaining([
        expect.stringContaining("request"),
        expect.stringContaining("info"),
        expect.stringContaining("warning"),
        expect.stringContaining("error"),
        expect.stringContaining("critical"),
      ]),
    );
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

  it("logs an ERROR via LogHelper if a severity directory fails unexpectedly", async () => {
    fsMock.readdir.mockRejectedValue(new Error("disk error"));

    await runLogRetention(NOW);

    expect(LogHelper.logError).toHaveBeenCalledWith(
      "logRetention",
      expect.any(Error),
      "error",
    );
  });
});
