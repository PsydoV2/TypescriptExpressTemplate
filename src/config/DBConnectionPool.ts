import mysql, { Pool } from "mysql2/promise";
import { env } from "./env";

export const isDBConfigured = () =>
  !!(env.DBHOST && env.DBPORT && env.DBNAME && env.DBUSER && env.DBPASSWORD);

export const DBConnectionPool: Pool = mysql.createPool({
  host: env.DBHOST,
  port: env.DBPORT,
  user: env.DBUSER,
  password: env.DBPASSWORD,
  database: env.DBNAME,

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
