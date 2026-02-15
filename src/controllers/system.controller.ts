import {NextFunction, Response} from "express";
import {checkDatabaseHealth} from "../utils/HealthCheck";

export const healthCheck = async (res: Response, next: NextFunction) => {
    try {
        const isDbHealthy: boolean = await checkDatabaseHealth();
        const status: 200 | 503 = isDbHealthy ? 200 : 503;

        res.status(status).json({
            status: isDbHealthy ? "UP" : "DOWN",
            timestamp: new Date().toISOString(),
            services: {
                database: isDbHealthy ? "healthy" : "unhealthy"
            }
        });
    } catch (error) {
        next(error);
    }
};