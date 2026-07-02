/**
 * Jest setup: provide deterministic environment variables before any module
 * (and therefore src/config/env.ts) is imported. Values already present in the
 * environment are respected, so CI can still override them.
 */
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  DBHOST: "localhost",
  DBPORT: "3306",
  DBNAME: "test_db",
  DBUSER: "test_user",
  DBPASSWORD: "test_password",
  SECRETKEYJWT: "test-secret",
  JWT_EXPIRES_IN: "1h",
  HTTPPORT: "9080",
  CORS_ORIGIN: "*",
  SMTP_HOST: "localhost",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "test@example.com",
  SMTP_PASS: "test-password",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
