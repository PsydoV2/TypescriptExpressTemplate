import { Request, Response } from "express";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { HTTPCodes } from "../utils/HTTPCodes";
import { LogHelper, LogSeverity } from "../utils/LogHelper";

export const UserService = {
  /**
   * Deletes the currently authenticated user account.
   * - Requires `req.userID` to be set by authentication middleware.
   * - Either performs a hard delete or can be adapted to "soft delete".
   */
  async deleteAccount(req: Request, res: Response) {
    const userID = (req as any).userID;

    if (!userID) {
      return res.status(HTTPCodes.BadRequest).json({
        message: "Missing userID parameter.",
      });
    }

    let connection;
    try {
      connection = await DBConnectionPool.getConnection();
      await connection.beginTransaction();

      // Example: Hard delete (adjust table/column names for your schema)
      await connection.query("DELETE FROM Users WHERE id = ?", [userID]);

      // Alternative: Soft delete (recommended for production apps)
      // await connection.query("UPDATE Users SET isActive = 0 WHERE id = ?", [userID]);

      await connection.commit();

      return res.status(HTTPCodes.OK).json({
        message: "Account deleted successfully.",
      });
    } catch (error) {
      if (connection) await connection.rollback();
      await LogHelper.logError("/deleteAccount", error, LogSeverity.CRITICAL);

      return res.status(HTTPCodes.InternalServerError).json({
        message: "An error occurred while deleting the account.",
      });
    } finally {
      if (connection) connection.release();
    }
  },
};
