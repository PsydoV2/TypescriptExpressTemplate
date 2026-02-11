import mysql, { Pool } from "mysql2/promise"; // Importiere den Pool-Typ direkt von /promise
import dotenv from "dotenv";

dotenv.config();

const { DBHOST, DBPORT, DBNAME, DBUSER, DBPASSWORD } = process.env;

export const isDBConfigured = () => !!(DBHOST && DBPORT && DBNAME && DBUSER && DBPASSWORD);

// Explizite Typisierung als Pool von mysql2/promise
export const DBConnectionPool: Pool = mysql.createPool({
  host: DBHOST,
  user: DBUSER,
  password: DBPASSWORD,
  database: DBNAME,
  port: parseInt(DBPORT || "0", 10),
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 50,
  connectTimeout: 10000,
  idleTimeout: 60000,
  enableKeepAlive: true,
});