import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Extract required database configuration from environment variables
const { DBHOST, DBPORT, DBNAME, DBUSER, DBPASSWORD } = process.env;

// Export a simple flag so callers can skip DB work if not configured
export const isDBConfigured = () => !!(DBHOST && DBPORT && DBNAME && DBUSER && DBPASSWORD);

// Create a reusable MySQL connection pool
export const DBConnectionPool = mysql.createPool({
  host: DBHOST,
  user: DBUSER,
  password: DBPASSWORD,
  database: DBNAME,
  port: parseInt(DBPORT || "0", 10),
  waitForConnections: true, // Queue connection requests if all are in use
  connectionLimit: 20, // Maximum number of connections in the pool
  queueLimit: 50, // Max number of queued connection requests
  connectTimeout: 10000, // Connection timeout in ms
  idleTimeout: 60000, // Idle connection timeout in ms
  enableKeepAlive: true, // Keep connections alive
});
