import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import https from "https";
import http from "http";
import fs from "fs";

import { authMiddleware } from "./middlewares/auth.middleware";
import { correlationId } from "./middlewares/correlationId.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { notFoundHandler } from "./middlewares/notFoundHandler.middleware";
import { EnvValidator } from "./utils/EnvValidator";
import { globalRequestLogger } from "./middlewares/requestLogger.middleware";
import { authRateLimit, globalRateLimit } from "./middlewares/rateLimiter.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import systemRoutes from "./routes/system.routes";
import { DBConnectionPool } from "./config/DBConnectionPool";

// Load environment variables
dotenv.config();

const startServer = async () => {
    // Validate required environment variables and then bootstrap the app
    await EnvValidator.checkEnv([
        "DBHOST",
        "DBPORT",
        "DBNAME",
        "DBUSER",
        "DBPASSWORD",
        "SECRETKEYJWT",
        "HTTPSPORT",
        "HTTPPORT",
        "CERTKEYPATH",
        "CERTPATH"
    ]);

    const app = express();

    // Security middleware
    app.use(helmet());

    // Correlation ID (must be first to attach ID to all logs/responses)
    app.use(correlationId);

    // Gzip compression
    app.use(compression());

    // JSON body parser with size limit
    app.use(express.json({ limit: "10kb" }));

    // Basic request logger (can be replaced with a proper logger like Winston or Pino)
    app.use(globalRequestLogger);

    // CORS configuration — set CORS_ORIGIN in .env, defaults to * for local development
    app.use(
        cors({
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST", "DELETE", "OPTIONS"],
            allowedHeaders: ["Authorization", "Content-Type", "x-request-id"],
            credentials: true,
        })
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
    const HTTPPORT: number = parseInt(process.env.HTTPPORT || "9080", 10);
    const HTTPSPORT: number = parseInt(process.env.HTTPSPORT || "9444", 10);
    const CERTKEYPATH: string = process.env.CERTKEYPATH || "";
    const CERTPATH: string = process.env.CERTPATH || "";

    /**
     * Start HTTP in local development (NODE_ENV=development),
     * otherwise start HTTPS server in production.
     */
    let server: http.Server | https.Server;

    if (process.env.NODE_ENV === "development") {
        server = http.createServer(app).listen(HTTPPORT, () => {
            console.log(`🚀 API (HTTP) running on port ${HTTPPORT}`);
        });
    } else {
        server = https
            .createServer(
                {
                    key: fs.readFileSync(CERTKEYPATH),
                    cert: fs.readFileSync(CERTPATH),
                },
                app
            )
            .listen(HTTPSPORT, () => {
                console.log(`🚀 API (HTTPS) running on port ${HTTPSPORT}`);
            });
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n${signal} received — shutting down gracefully...`);
        server.close(async () => {
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
