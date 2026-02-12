import { DBConnectionPool } from "../config/DBConnectionPool";
import {DTOUser} from "../types/User/user";

export const UserRepository = {
    async findUserByID(userID: string, connection?: any): Promise<DTOUser> {
        const db = connection || DBConnectionPool;

        const [rows]: any = await db.query(
            "SELECT * FROM Users WHERE userID = ?",
            [userID]
        );

        return rows[0] || null;
    },

    async findUserByEmail(email: string, connection?: any): Promise<DTOUser> {
        const db = connection || DBConnectionPool;

        const [rows]: any = await db.query(
            "SELECT * FROM Users WHERE email = ?",
            [email]
        );

        return rows[0] || null;
    },

    async findUserByUsername(username: string, connection?: any): Promise<DTOUser> {
        const db = connection || DBConnectionPool;

        const [rows]: any = await db.query(
            "SELECT * FROM Users WHERE username = ?",
            [username]
        );

        return rows[0] || null;
    },

    async deleteUserByID(id: string, connection?: any): Promise<any> {
        const db = connection || DBConnectionPool;

        return db.query("DELETE FROM Users WHERE userID = ?", [id]);
    },

    async createNewUser(username: string, email: string, passwordHash: string, connection?: any): Promise<any> {
        const db = connection || DBConnectionPool;

        const [rows]: any = await db.query(
            "INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?)",
            [username, email, passwordHash]
        );

        return rows[0] || null;
    }
};