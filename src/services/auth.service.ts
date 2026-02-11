import {Request, Response} from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {DBConnectionPool} from "../config/DBConnectionPool";
import {LogHelper, LogSeverity} from "../utils/LogHelper";
import {HTTPCodes} from "../utils/HTTPCodes";
import {ApiError} from "../utils/ApiError";
import {UserRepository} from "../repositories/user.repository";

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
  async registerUser(username: string, email: string, password: string) {

    if (!username || !email || !password) {
      throw new ApiError(HTTPCodes.BadRequest, 'Missing required parameter');
    }

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

      const newUser = await UserRepository.findUserByUsername(username, connection);
      const userID = newUser.userID;

      // Generate JWT
      const token = jwt.sign({ userID: userID }, SECRET, { expiresIn: "100h" });

      await connection.commit();

      return {
        token,
        userID,
        username,
        email,
      };
    } catch (error) {
      await connection.rollback()
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

    if (!emailOrUsername || !password) {
      throw new ApiError(HTTPCodes.BadRequest, 'Missing required parameter');
    }

    const connection = await DBConnectionPool.getConnection();

    try {
      let user;
      const userByEmail = await UserRepository.findUserByEmail(emailOrUsername, connection);

      // Find user by email or username
      if (!userByEmail) {
        const userByUsername = await UserRepository.findUserByUsername(emailOrUsername, connection);

        if(!userByUsername) throw new ApiError(HTTPCodes.NotFound, "User not found");
        else user = userByUsername;
      } else{
        user = userByEmail;
      }

      if(!user || !(await bcrypt.compare(password, user.passwordHash))){
        throw new ApiError(HTTPCodes.Conflict, "Invalid login");
      }

      // Generate JWT
      const token = jwt.sign({ userID: user.userID }, SECRET, { expiresIn: "100h" });

      return {
        token,
        userID: user.userID,
        userName: user.username,
        email: user.email,
      };
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  },
};
