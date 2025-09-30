import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { LogHelper, LogSeverity } from "../utils/LogHelper";
import { HTTPCodes } from "../utils/HTTPCodes";

// Secret key used to sign JWT tokens
const SECRET = process.env.SECRETKEYJWT!;

export const AuthService = {
  /**
   * Handles user registration.
   * - Validates required fields
   * - Checks if username/email already exist
   * - Hashes password and stores new user
   * - Returns JWT token and basic user info
   */
  async register(req: Request, res: Response) {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res
        .status(HTTPCodes.BadRequest)
        .json({ message: "Missing parameters." });
    }

    let connection;
    try {
      connection = await DBConnectionPool.getConnection();

      // Example: check if user already exists (adjust query for your schema)
      const [existing] = await connection.query(
        "SELECT id FROM Users WHERE email = ? OR userName = ?",
        [email, userName]
      );

      if ((existing as any[]).length > 0) {
        return res
          .status(HTTPCodes.Conflict)
          .json({ message: "Email or username already in use." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into database (adjust fields for your schema)
      const [insertResult]: any = await connection.query(
        "INSERT INTO Users (userName, email, passwordHash) VALUES (?, ?, ?)",
        [userName, email, hashedPassword]
      );

      const userId = insertResult.insertId;

      // Generate JWT
      const token = jwt.sign({ userID: userId }, SECRET, { expiresIn: "1h" });

      return res.status(HTTPCodes.OK).json({
        token,
        userID: userId,
        userName,
        email,
      });
    } catch (err) {
      await LogHelper.logError("/register", err, LogSeverity.CRITICAL);
      return res
        .status(HTTPCodes.InternalServerError)
        .json({ message: "Registration failed." });
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Handles user login.
   * - Validates credentials
   * - Checks username/email + password
   * - Returns JWT token and basic user info
   */
  async login(req: Request, res: Response) {
    const { emailOrUserName, password } = req.body;

    if (!emailOrUserName || !password) {
      return res
        .status(HTTPCodes.BadRequest)
        .json({ message: "Missing credentials." });
    }

    let connection;
    try {
      connection = await DBConnectionPool.getConnection();

      // Find user by email or username
      const [result] = await connection.query(
        "SELECT * FROM Users WHERE userName = ? OR email = ?",
        [emailOrUserName, emailOrUserName]
      );

      const user = (result as any[])[0];

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res
          .status(HTTPCodes.Unauthorized)
          .json({ message: "Invalid login." });
      }

      // Generate JWT
      const token = jwt.sign({ userID: user.id }, SECRET, { expiresIn: "1h" });

      return res.status(HTTPCodes.OK).json({
        token,
        userID: user.id,
        userName: user.userName,
        email: user.email,
      });
    } catch (err) {
      await LogHelper.logError("/login", err, LogSeverity.CRITICAL);
      return res
        .status(HTTPCodes.InternalServerError)
        .json({ message: "Login failed." });
    } finally {
      if (connection) connection.release();
    }
  },
};
