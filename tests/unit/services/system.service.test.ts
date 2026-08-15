import { SystemService } from "../../../src/services/system.service";
import { SystemRepository } from "../../../src/repositories/system.repository";
import { EmailHelper } from "../../../src/helper/email.helper";
import { getDBPoolStats } from "../../../src/config/db.config";

jest.mock("../../../src/repositories/system.repository");
jest.mock("../../../src/helper/email.helper");
jest.mock("../../../src/config/db.config", () => ({
  getDBPoolStats: jest.fn(),
}));

describe("SystemService.health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("includes the DB pool stats in the health response", async () => {
    (SystemRepository.checkDatabaseHealth as jest.Mock).mockResolvedValue(true);
    (EmailHelper.verifyConnection as jest.Mock).mockResolvedValue(true);
    (getDBPoolStats as jest.Mock).mockReturnValue({
      total: 5,
      free: 3,
      limit: 20,
    });

    const result = await SystemService.health();

    expect(result.pool).toEqual({ total: 5, free: 3, limit: 20 });
  });

  it("reports UP with healthy services when DB and email are both healthy", async () => {
    (SystemRepository.checkDatabaseHealth as jest.Mock).mockResolvedValue(true);
    (EmailHelper.verifyConnection as jest.Mock).mockResolvedValue(true);
    (getDBPoolStats as jest.Mock).mockReturnValue({
      total: 1,
      free: 1,
      limit: 20,
    });

    const result = await SystemService.health();

    expect(result.status).toBe("UP");
    expect(result.services).toEqual({ database: "healthy", email: "healthy" });
  });

  it("reports DOWN when the database is unhealthy, still surfacing pool stats", async () => {
    (SystemRepository.checkDatabaseHealth as jest.Mock).mockResolvedValue(
      false,
    );
    (EmailHelper.verifyConnection as jest.Mock).mockResolvedValue(true);
    (getDBPoolStats as jest.Mock).mockReturnValue({
      total: null,
      free: null,
      limit: 20,
    });

    const result = await SystemService.health();

    expect(result.status).toBe("DOWN");
    expect(result.services.database).toBe("unhealthy");
    expect(result.pool).toEqual({ total: null, free: null, limit: 20 });
  });
});
