import { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { DTOUser, DTOUserPublic } from "../types/User/user";

/** A pool or a checked-out connection (used inside transactions). */
type DBExecutor = Pool | PoolConnection;

// Explicit column lists instead of `SELECT *`: keeps the passwordHash out of
// results unless it is actually needed (login lookups).
const PUBLIC_COLUMNS = "userID, username, email, createdAt, isActive";
const AUTH_COLUMNS =
  "userID, username, email, passwordHash, createdAt, isActive";

export const UserRepository = {
  async findUserByID(
    userID: string,
    connection?: DBExecutor,
  ): Promise<DTOUserPublic | null> {
    const db = connection ?? DBConnectionPool;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${PUBLIC_COLUMNS} FROM Users WHERE userID = ?`,
      [userID],
    );

    return (rows[0] as DTOUserPublic) ?? null;
  },

  async findUserByEmail(
    email: string,
    connection?: DBExecutor,
  ): Promise<DTOUser | null> {
    const db = connection ?? DBConnectionPool;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${AUTH_COLUMNS} FROM Users WHERE email = ?`,
      [email],
    );

    return (rows[0] as DTOUser) ?? null;
  },

  async findUserByUsername(
    username: string,
    connection?: DBExecutor,
  ): Promise<DTOUser | null> {
    const db = connection ?? DBConnectionPool;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${AUTH_COLUMNS} FROM Users WHERE username = ?`,
      [username],
    );

    return (rows[0] as DTOUser) ?? null;
  },

  async deleteUserByID(id: string, connection?: DBExecutor): Promise<void> {
    const db = connection ?? DBConnectionPool;

    await db.query("DELETE FROM Users WHERE userID = ?", [id]);
  },

  async createNewUser(
    username: string,
    email: string,
    passwordHash: string,
    connection?: DBExecutor,
  ): Promise<void> {
    const db = connection ?? DBConnectionPool;

    await db.query(
      "INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?)",
      [username, email, passwordHash],
    );
  },
};
