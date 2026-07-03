import argon2 from "argon2";
import { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ApiError } from "../utils/ApiError";
import { UserRepository } from "../repositories/user.repository";
import { JWTToken } from "../utils/JWTToken";
import { DTOUser } from "../types/DTOUser";
import { ErrorCode } from "../utils/ErrorCodes";

export const AuthService = {
  async registerUser(username: string, email: string, password: string) {
    const connection = await DBConnectionPool.getConnection();

    try {
      await connection.beginTransaction();

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

      // argon2id is the current OWASP-recommended password hashing algorithm
      const hashedPassword = await argon2.hash(password);

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

      const jwtExpiry = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
      const token = JWTToken.generateAuthToken(newUser.userID, jwtExpiry);

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

  async loginUser(emailOrUsername: string, password: string) {
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

    const jwtExpiry = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
    const token = JWTToken.generateAuthToken(user.userID, jwtExpiry);

    return {
      token,
      userID: user.userID,
      username: user.username,
      email: user.email,
    };
  },
};
