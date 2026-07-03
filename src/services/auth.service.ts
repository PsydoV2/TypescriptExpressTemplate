import argon2 from "argon2";
import { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ApiError } from "../utils/ApiError";
import { UserRepository } from "../repositories/user.repository";
import { AuthRepository } from "../repositories/auth.repository";
import { DTOUser } from "../types/DTOUser";
import { ErrorCode } from "../utils/ErrorCodes";

export const AuthService = {
  /**
   * Handles user registration.
   * - Validates required fields
   * - Checks if username/email already exist
   * - Hashes password and stores new user
   * - Returns JWT token and basic user info
   */
  async registerUser(username: string, email: string, password: string) {
    const connection = await DBConnectionPool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if user already exists
      const userByEmail = await UserRepository.findUserByEmail(
        email,
        connection,
      );

      if (userByEmail)
        throw new ApiError(
          HTTPCodes.Conflict,
          ErrorCode.EMAIL_TAKEN,
          "E-mail already exists",
        );

      const userByUsername = await UserRepository.findUserByUsername(
        username,
        connection,
      );

      if (userByUsername)
        throw new ApiError(
          HTTPCodes.Conflict,
          ErrorCode.USERNAME_TAKEN,
          "Username already exists",
        );

      // Hash password (argon2id is the current OWASP-recommended algorithm)
      const hashedPassword = await argon2.hash(password);

      // Insert user into database
      await UserRepository.createNewUser(
        username,
        email,
        hashedPassword,
        connection,
      );

      const newUser = await UserRepository.findUserByUsername(
        username,
        connection,
      );

      if (!newUser)
        throw new ApiError(
          HTTPCodes.InternalServerError,
          ErrorCode.INTERNAL_ERROR,
          "User creation failed",
        );

      // Generate JWT
      const jwtExpiry = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
      const token = AuthRepository.generateJWT(newUser.userID, jwtExpiry);

      await connection.commit();

      return {
        token,
        userID: newUser.userID,
        username,
        email,
      };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Handles user login.
   * - Validates credentials
   * - Checks username/email + password
   * - Returns JWT token and basic user info
   */
  async loginUser(emailOrUsername: string, password: string) {
    // Find user by email or username
    const user: DTOUser | null =
      (await UserRepository.findUserByEmail(emailOrUsername)) ||
      (await UserRepository.findUserByUsername(emailOrUsername));

    const invalidError = new ApiError(
      HTTPCodes.Unauthorized,
      ErrorCode.INVALID_LOGIN,
      "Invalid login",
    );

    if (!user) throw invalidError;

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) throw invalidError;

    // Generate JWT
    const jwtExpiry = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
    const token = AuthRepository.generateJWT(user.userID, jwtExpiry);

    return {
      token,
      userID: user.userID,
      username: user.username,
      email: user.email,
    };
  },
};
