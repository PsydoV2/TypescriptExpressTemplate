// Import the validated env first so misconfiguration fails fast at startup.
import { env } from "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import http from "node:http";

import { authMiddleware } from "./middlewares/auth.middleware";
import { correlationId } from "./middlewares/correlationId.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { notFoundHandler } from "./middlewares/notFoundHandler.middleware";
import { globalRequestLogger } from "./middlewares/requestLogger.middleware";
import {
  authRateLimit,
  globalRateLimit,
} from "./middlewares/rateLimiter.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import systemRoutes from "./routes/system.routes";
import { DBConnectionPool } from "./config/DBConnectionPool";
import { requestTimeout } from "./middlewares/timeout.middleware";
import { ApiError } from "./utils/ApiError";
import { ErrorCode } from "./utils/ErrorCodes";
import { HTTPCodes } from "./utils/HTTPCodes";

const startServer = async () => {
  const app = express();

  app.set("trust proxy", 1);

  // Correlation ID: must be first so all subsequent logs carry the request ID
  app.use(correlationId);

  // Request timeout: 30s per request
  app.use(requestTimeout);

  // Security middleware
  app.use(helmet());

  // Gzip compression
  app.use(compression());

  // JSON body parser with size limit
  app.use(express.json({ limit: "10kb" }));

  // Basic request logger (can be replaced with a proper logger like Winston or Pino)
  app.use(globalRequestLogger);

  // CORS configuration — set CORS_ORIGIN in .env, defaults to * for local development
  const allowedOrigins = env.CORS_ORIGIN.split(",");
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins?.includes(origin)) {
          callback(null, true);
        } else {
          callback(
            new ApiError(
              HTTPCodes.Forbidden,
              ErrorCode.CORS_UNALLOWED,
              "Not allowed by CORS",
            ),
          );
        }
      },
      methods: ["GET", "POST", "OPTIONS", "DELETE", "PATCH"],
      allowedHeaders: ["Authorization", "Content-Type", "x-request-id"],
      credentials: true,
    }),
  );

  // Global rate limiting
  app.use(globalRateLimit);

  // Routes (versioned under /api/v1/)
  app.use("/api/v1/system/", systemRoutes);
  app.use("/api/v1/auth/", authRateLimit, authRoutes);
  app.use("/api/v1/user/", authMiddleware, userRoutes);

  // Fallbacks
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Ports
  const HTTPPORT = env.HTTPPORT;

  /**
   * Start HTTP Server (use HTTPS Proxy in Production)
   */

  const httpServer = http.createServer(app);
  // TCP-level safety net: close idle/stale connections after 60s
  httpServer.setTimeout(60_000);
  httpServer.listen(HTTPPORT, () => {
    console.log(`🚀 API (HTTP) running on port ${HTTPPORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    httpServer.close(async () => {
      try {
        await DBConnectionPool.end();
        console.log("Database pool closed.");
      } catch (err) {
        console.error("Error closing database pool:", err);
      }
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

void startServer();
