import bcrypt from "bcrypt";
import {DBConnectionPool} from "../config/DBConnectionPool";
import {HTTPCodes} from "../utils/HTTPCodes";
import {ApiError} from "../utils/ApiError";
import {UserRepository} from "../repositories/user.repository";
import {AuthRepository} from "../repositories/auth.repository";
import {DTOUser} from "../types/User/user";


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
      const userByEmail = await UserRepository.findUserByEmail(email, connection);

      if(userByEmail) throw new ApiError(HTTPCodes.Conflict, "E-mail already exists");

      const userByUsername = await UserRepository.findUserByUsername(username, connection);

      if(userByUsername) throw new ApiError(HTTPCodes.Conflict, "Username already exists");

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into database
      await UserRepository.createNewUser(username, email, hashedPassword, connection);

      const newUser: DTOUser = await UserRepository.findUserByUsername(username, connection);

      // Generate JWT
      const token = AuthRepository.generateJWT(newUser.userID, "100h");

      await connection.commit();

      return {
        token,
        userID: newUser.userID,
        username,
        email,
      };
    } catch (error) {
      if (connection) await connection.rollback()
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
    const user: DTOUser = (await UserRepository.findUserByEmail(emailOrUsername)) ||
        (await UserRepository.findUserByUsername(emailOrUsername));

    const invalidError = new ApiError(HTTPCodes.Unauthorized, "Invalid email/username or password");

    if (!user) throw invalidError;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw invalidError;

    // Generate JWT
    const token = AuthRepository.generateJWT(user.userID, "100h");

    return {
      token,
      userID: user.userID,
      userName: user.username,
      email: user.email,
    };
  }
};
