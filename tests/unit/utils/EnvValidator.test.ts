import { EnvValidator } from "../../../src/utils/EnvValidator";

const ORIGINAL_ENV = { ...process.env };

describe("EnvValidator.checkEnv", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it("exits when required keys are missing", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code}`);
      }) as never);

    await expect(EnvValidator.checkEnv(["A", "B"]))
      .rejects
      .toThrow("process.exit:1");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not exit when all required keys are present", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code}`);
      }) as never);

    process.env.A = "ok";
    process.env.B = "ok";

    await EnvValidator.checkEnv(["A", "B"]);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

