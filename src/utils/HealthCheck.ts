import { DBConnectionPool } from "../config/DBConnectionPool";
import { LogHelper, LogSeverity } from "./LogHelper";

export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        await DBConnectionPool.query("SELECT 1");
        return true;
    } catch (error) {
        await LogHelper.logError("checkDatabaseHealth()", error, LogSeverity.CRITICAL);
        return false;
    }
};