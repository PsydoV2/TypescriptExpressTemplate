import { DBConnectionPool } from "../config/db.config";
import { LogHelper, LogSeverity } from "../helper/log.helper";

export const SystemRepository = {
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await DBConnectionPool.query("SELECT 1");
      return true;
    } catch (error) {
      await LogHelper.logError(
        "checkDatabaseHealth()",
        error,
        LogSeverity.CRITICAL,
      );
      return false;
    }
  },
};
