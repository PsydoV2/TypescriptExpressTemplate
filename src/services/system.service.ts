import { EmailHelper } from "../helper/EmailHelper";
import { SystemRepository } from "../repositories/system.repository";
import DTOSystemHealth from "../types/DTOSystemHealth";

export const SystemService = {
  async health(): Promise<DTOSystemHealth> {
    const isDbHealthy: boolean = await SystemRepository.checkDatabaseHealth();
    const isEmailHealthy: boolean = await EmailHelper.verifyConnection();

    return {
      status: isDbHealthy && isEmailHealthy ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
      services: {
        database: isDbHealthy ? "healthy" : "unhealthy",
        email: isEmailHealthy ? "healthy" : "unhealthy",
      },
    };
  },
};
