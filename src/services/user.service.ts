import {UserRepository} from "../repositories/user.repository";
import {DBConnectionPool} from "../config/DBConnectionPool";
import {ApiError} from "../utils/ApiError";
import {HTTPCodes} from "../utils/HTTPCodes";

export const UserService = {
  async deleteUser(userID: string) {
    const connection = await DBConnectionPool.getConnection();

    try{
      await connection.beginTransaction();

      const user = await  UserRepository.findUserByID(userID, connection);

      if (!user) throw new ApiError(HTTPCodes.NotFound, "User not found");

      await UserRepository.deleteUserByID(userID, connection);

      await connection.commit();

      return {success: true};
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getUser(userID: string) {
    const connection = await DBConnectionPool.getConnection();

    try{
      const user = await UserRepository.findUserByID(userID, connection);

      if (!user) throw new ApiError(HTTPCodes.NotFound, "User not found");

      return user;
    } catch (error) {
      throw error;
    }finally {
      connection.release();
    }
  }
};