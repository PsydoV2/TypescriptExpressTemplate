import argon2 from "argon2";
import { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { EMAIL_FROM } from "../config/email.config";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ApiError } from "../utils/ApiError";
import { UserRepository } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refreshToken.repository";
import { JWTToken } from "../utils/JWTToken";
import { EmailHelper } from "../helper/EmailHelper";
import { DTOUser } from "../types/DTOUser";
import { ErrorCode } from "../utils/ErrorCodes";

async function sendWelcomeEmail(username: string, email: string) {
  try {
    await EmailHelper.sendEmailFromTemplate({
      to: email,
      subject: `Welcome to ${env.APP_NAME}`,
      templateName: "welcome",
      variables: {
        username,
        appName: env.APP_NAME,
        appUrl: env.APP_URL,
        supportEmail: EMAIL_FROM,
        privacyUrl: env.PRIVACY_URL,
        registeredAt: new Date().toISOString().slice(0, 10),
      },
    });
  } catch {
    // Already logged by EmailHelper; a failed welcome email must not fail registration.
  }
}

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
      const refreshToken = await RefreshTokenRepository.create(
        newUser.userID,
        connection,
      );

      await connection.commit();

      await sendWelcomeEmail(username, email);

      return {
        token,
        refreshToken,
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
    const refreshToken = await RefreshTokenRepository.create(user.userID);

    return {
      token,
      refreshToken,
      userID: user.userID,
      username: user.username,
      email: user.email,
    };
  },

  /** Exchanges a valid refresh token for a new short-lived access token. */
  async refreshAccessToken(refreshToken: string) {
    const found = await RefreshTokenRepository.findByToken(refreshToken);

    if (!found)
      throw new ApiError(
        HTTPCodes.Unauthorized,
        ErrorCode.INVALID_REFRESH_TOKEN,
        "Invalid refresh token",
      );

    if (found.expired)
      throw new ApiError(
        HTTPCodes.Unauthorized,
        ErrorCode.REFRESH_TOKEN_EXPIRED,
        "Refresh token expired",
      );

    const jwtExpiry = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
    const token = JWTToken.generateAuthToken(found.userID, jwtExpiry);

    return { token };
  },

  /** Revokes a refresh token so it can no longer be exchanged for access tokens. */
  async logout(refreshToken: string) {
    await RefreshTokenRepository.revoke(refreshToken);
    return { success: true };
  },

  /**
   * Emails a password-reset link if the address belongs to an account.
   * Always resolves the same way regardless of whether the email exists, so
   * this endpoint can't be used to enumerate registered accounts.
   */
  async requestPasswordReset(email: string) {
    const user = await UserRepository.findUserByEmail(email);

    if (user) {
      const resetToken = JWTToken.generatePasswordResetToken(
        user.userID,
        `${env.PASSWORD_RESET_EXPIRES_IN_MINUTES}m`,
      );

      try {
        await EmailHelper.sendEmailFromTemplate({
          to: user.email,
          subject: `Reset your ${env.APP_NAME} password`,
          templateName: "password-reset",
          variables: {
            username: user.username,
            appName: env.APP_NAME,
            resetLink: `${env.APP_URL}/reset-password?token=${resetToken}`,
            expiryMinutes: String(env.PASSWORD_RESET_EXPIRES_IN_MINUTES),
            supportEmail: EMAIL_FROM,
            privacyUrl: env.PRIVACY_URL,
          },
        });
      } catch {
        // Already logged by EmailHelper; this endpoint must not reveal failures.
      }
    }

    return { success: true };
  },

  async resetPassword(token: string, newPassword: string) {
    const userID = JWTToken.verifyPasswordResetToken(token);

    if (!userID)
      throw new ApiError(
        HTTPCodes.Unauthorized,
        ErrorCode.INVALID_RESET_TOKEN,
        "Invalid or expired reset link",
      );

    const hashedPassword = await argon2.hash(newPassword);
    await UserRepository.updatePasswordByID(userID, hashedPassword);

    return { success: true };
  },
};
