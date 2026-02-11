// index.ts – Entry point of the API (Express + TypeScript)
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import https from "https";
import http from "http";
import fs from "fs";
import { json } from "body-parser";

import { globalRateLimiter } from "./middlewares/globalRateLimiter.middleware";
import { authMiddleware } from "./middlewares/auth.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { EnvValidator } from "./utils/EnvValidator";
import {LogHelper} from "./utils/LogHelper";

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

    // JSON body parser
    app.use(json());

    // Basic request logger (can be replaced with a proper logger like Winston or Pino)
    app.use(async (req, _res, next) => {
        const payload = req.body ? JSON.stringify(req.body) : "";
        await LogHelper.logRequest(req.originalUrl || req.url, payload);
        next();
    });

    // CORS configuration (customize per project)
    app.use(
        cors({
          origin: "*",
          methods: ["GET", "POST", "OPTIONS"],
          allowedHeaders: ["Authorization", "Content-Type"],
          credentials: true,
        })
    );

    // Global rate limiting
    app.use(globalRateLimiter);

    // Routes
    app.use("/api", authRoutes);
    app.use("/api", authMiddleware, userRoutes);

    // Fallbacks
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Ports
    const HTTPPORT: number = Number(process.env.HTTPPORT) || 9080;
    const HTTPSPORT: number = Number(process.env.HTTPSPORT) || 9444;
    const CERTKEYPATH: string = process.env.CERTKEYPATH || "";
    const CERTPATH: string = process.env.CERTPATH || "";

    /**
    * Start HTTP in local development (NODE_ENV=localhost),
    * otherwise start HTTPS server in production.
    */
    if (process.env.NODE_ENV === "localhost") {
        http.createServer(app).listen(HTTPPORT, () => {
          console.log(`🚀 API (HTTP) running on port ${HTTPPORT}`);
        });
    } else {
        https
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
};

void startServer();
