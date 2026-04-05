export default interface DTOSystemHealth {
  status: "UP" | "DOWN";
  timestamp: string;
  services: {
    database: "healthy" | "unhealthy";
    email: "healthy" | "unhealthy";
  };
}
