import mysql, { Pool } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const { DBHOST, DBPORT, DBNAME, DBUSER, DBPASSWORD } = process.env;

export const isDBConfigured = () =>
  !!(DBHOST && DBPORT && DBNAME && DBUSER && DBPASSWORD);

export const DBConnectionPool: Pool = mysql.createPool({
  host: DBHOST,
  port: parseInt(DBPORT || "0", 10),
  user: DBUSER,
  password: DBPASSWORD,
  database: DBNAME,

  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10s
  connectTimeout: 10000, // 10s

  supportBigNumbers: true,
  decimalNumbers: true,
  dateStrings: true,
});
