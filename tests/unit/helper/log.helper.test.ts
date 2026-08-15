/* eslint-disable @typescript-eslint/no-require-imports -- modules are
   re-required per test (after jest.resetModules()) to get a fresh copy of
   LogHelper's cached directory-resolution state. */
import path from "node:path";

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn(),
  access: jest.fn(),
  appendFile: jest.fn(),
  constants: { W_OK: 2 },
}));

jest.mock("../../../src/config/env.config", () => ({
  env: { LOG_DIR: undefined },
}));

jest.mock("../../../src/config/db.config", () => ({
  DBConnectionPool: { getConnection: jest.fn() },
  isDBConfigured: jest.fn(),
}));

jest.mock("../../../src/utils/requestContext.util", () => ({
  getRequestId: jest.fn(() => undefined),
}));

describe("LogHelper", () => {
  let fsp: typeof import("node:fs/promises") & {
    mkdir: jest.Mock;
    access: jest.Mock;
    appendFile: jest.Mock;
  };
  let envModule: { env: { LOG_DIR: string | undefined } };
  let dbModule: {
    DBConnectionPool: { getConnection: jest.Mock };
    isDBConfigured: jest.Mock;
  };
  let LogHelper: typeof import("../../../src/helper/log.helper").LogHelper;
  let LogSeverity: typeof import("../../../src/helper/log.helper").LogSeverity;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    fsp = require("node:fs/promises");
    fsp.mkdir.mockResolvedValue(undefined);
    fsp.access.mockResolvedValue(undefined);
    fsp.appendFile.mockResolvedValue(undefined);

    envModule = require("../../../src/config/env.config");
    envModule.env.LOG_DIR = undefined;

    dbModule = require("../../../src/config/db.config");
    dbModule.isDBConfigured.mockReturnValue(false);

    ({ LogHelper, LogSeverity } = require("../../../src/helper/log.helper"));
  });

  it("writes to a per-severity subdirectory: logs/<severity>/<date>.log", async () => {
    await LogHelper.logInfo("test-route", "hello world");

    expect(fsp.appendFile).toHaveBeenCalledTimes(1);
    const [filePath, line] = fsp.appendFile.mock.calls[0];
    expect(filePath).toMatch(/logs[\\/]info[\\/]\d{4}-\d{2}-\d{2}\.log$/);
    expect(line).toContain("hello world");
  });

  it("resolves and caches the log directory once per severity", async () => {
    await LogHelper.logInfo("route1", "msg1");
    await LogHelper.logInfo("route2", "msg2");

    // One mkdir/access pair for the base dir, one for the "info" subdir —
    // not repeated on the second call.
    expect(fsp.mkdir).toHaveBeenCalledTimes(2);
    expect(fsp.access).toHaveBeenCalledTimes(2);
  });

  it("getBaseLogDir returns the resolved base logs directory", async () => {
    const dir = await LogHelper.getBaseLogDir();
    expect(path.basename(dir)).toBe("logs");
  });

  it("falls back to the default log directory when LOG_DIR isn't writable", async () => {
    const configuredDir = path.resolve("/not/writable/dir");
    envModule.env.LOG_DIR = "/not/writable/dir";

    fsp.access.mockImplementation((dir: unknown) => {
      if (dir === configuredDir) {
        return Promise.reject(new Error("EACCES: permission denied"));
      }
      return Promise.resolve(undefined);
    });

    await LogHelper.logInfo("route", "msg");

    const [filePath] = fsp.appendFile.mock.calls[0];
    expect(filePath).not.toContain(configuredDir);
    expect(filePath).toMatch(/logs[\\/]info[\\/]\d{4}-\d{2}-\d{2}\.log$/);
    expect(console.error).toHaveBeenCalled();
  });

  it("logError performs a plain INSERT without wrapping it in a transaction", async () => {
    const query = jest.fn().mockResolvedValue([{}]);
    const release = jest.fn();
    const beginTransaction = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();

    dbModule.isDBConfigured.mockReturnValue(true);
    dbModule.DBConnectionPool.getConnection.mockResolvedValue({
      query,
      release,
      beginTransaction,
      commit,
      rollback,
    });

    await LogHelper.logError("route", new Error("boom"), LogSeverity.ERROR);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("INSERT INTO ErrorLog");
    expect(beginTransaction).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("logs a CRITICAL file entry and still releases the connection when the INSERT fails", async () => {
    const query = jest.fn().mockRejectedValue(new Error("db down"));
    const release = jest.fn();

    dbModule.isDBConfigured.mockReturnValue(true);
    dbModule.DBConnectionPool.getConnection.mockResolvedValue({
      query,
      release,
    });

    await LogHelper.logError("route", new Error("boom"), LogSeverity.ERROR);

    expect(release).toHaveBeenCalledTimes(1);
    const criticalCall = fsp.appendFile.mock.calls.find(
      ([filePath]: [string]) =>
        filePath.includes(`${path.sep}critical${path.sep}`),
    );
    expect(criticalCall).toBeDefined();
    expect(criticalCall![1]).toContain("DB logging failed");
  });
});
