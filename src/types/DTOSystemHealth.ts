export interface DTOSystemHealth {
  status: "UP" | "DOWN";
  timestamp: string;
  services: {
    database: "healthy" | "unhealthy";
    email: "healthy" | "unhealthy";
  };
  pool?: {
    total: number | null;
    free: number | null;
    limit: number;
  };
}
