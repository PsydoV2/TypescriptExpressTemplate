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
  let LogHelper: typeof import("../../../src/helper/log.helper").LogHelper;
  let LogSeverity: typeof import("../../../src/helper/log.helper").LogSeverity;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    fsp = require("node:fs/promises");
    fsp.mkdir.mockResolvedValue(undefined);
    fsp.access.mockResolvedValue(undefined);
    fsp.appendFile.mockResolvedValue(undefined);

    envModule = require("../../../src/config/env.config");
    envModule.env.LOG_DIR = undefined;

    ({ LogHelper, LogSeverity } = require("../../../src/helper/log.helper"));
  });

  it("writes to a per-day subdirectory: logs/<date>/<severity>.log", async () => {
    await LogHelper.logInfo("test-route", "hello world");

    expect(fsp.appendFile).toHaveBeenCalledTimes(1);
    const [filePath, line] = fsp.appendFile.mock.calls[0];
    expect(filePath).toMatch(/logs[\\/]\d{4}-\d{2}-\d{2}[\\/]info\.log$/);
    expect(line).toContain("hello world");
  });

  it("writes different severities into the same day's directory", async () => {
    await LogHelper.logInfo("route1", "msg1");
    await LogHelper.logError("route2", new Error("boom"), LogSeverity.ERROR);

    const [infoPath] = fsp.appendFile.mock.calls[0];
    const [errorPath] = fsp.appendFile.mock.calls[1];
    expect(path.dirname(infoPath)).toBe(path.dirname(errorPath));
    expect(path.basename(infoPath)).toBe("info.log");
    expect(path.basename(errorPath)).toBe("error.log");
  });

  it("mirrors every log line to the console method matching its severity", async () => {
    await LogHelper.logInfo("route", "info msg");
    await LogHelper.logRequest("route", "request payload");
    await LogHelper.logError("route", new Error("warn msg"), LogSeverity.WARNING);
    await LogHelper.logError("route", new Error("error msg"), LogSeverity.ERROR);
    await LogHelper.logError("route", new Error("critical msg"), LogSeverity.CRITICAL);

    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("info msg"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("request payload"));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("warn msg"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("error msg"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("critical msg"));

    // Mirrored line has no trailing newline (unlike the one written to file).
    const [infoLine] = (console.info as jest.Mock).mock.calls[0];
    expect(infoLine.endsWith("\n")).toBe(false);
  });

  it("resolves and caches the log directory once per day", async () => {
    await LogHelper.logInfo("route1", "msg1");
    await LogHelper.logInfo("route2", "msg2");

    // One mkdir/access pair for the base dir, one for today's date subdir —
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
    expect(filePath).toMatch(/logs[\\/]\d{4}-\d{2}-\d{2}[\\/]info\.log$/);
    expect(console.error).toHaveBeenCalled();
  });
});
