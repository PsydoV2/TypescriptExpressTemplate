# Express + TypeScript Backend Template

A professional, scalable backend template built with **Express** and **TypeScript**. Focuses on a strict **Service-Repository pattern**, type-safe **Zod validation**, and a robust logging system.

Requires Node.js **>= 20**.

---

## 📂 Project Structure

```text
src/
├── config/             # DB Pool & system configurations
├── controllers/        # Express route handlers (Request/Response)
├── middlewares/        # Auth, Error, Rate Limiting, Zod Validation, Correlation ID
├── repositories/       # Data Access Layer (SQL queries)
├── routes/             # API Route definitions
├── schemas/            # Zod validation schemas (single source of truth)
├── services/           # Business logic & transaction management
├── types/              # TypeScript interfaces/DTOs
├── utils/              # Helpers (ApiError, LogHelper, JWT, RequestContext)
└── index.ts            # Entry point
```

---

## 🛡️ Core Features & Security

### 1. Request Validation (Zod)

All incoming data is validated through **Zod schemas** before reaching the controller.

- **Type safety**: Automatic transformations (e.g. string to UUID).
- **Centralized**: Schemas live in `src/schemas/` and are applied via middleware.
- **Clear error messages**: Validation errors include the exact field path and the violated rule.

### 2. Service-Repository Pattern

- **Services**: Contain business logic and manage **database transactions** (commit/rollback) to guarantee data consistency.
- **Repositories**: Pure database interaction — no knowledge of HTTP or business logic.

### 3. Professional Logging

`LogHelper` writes logs by severity (`INFO`, `REQUEST`, `WARNING`, `ERROR`, `CRITICAL`):

- **Files**: All logs are written to daily rotating `.log` files.
- **Database**: Errors (`WARNING` and above) are additionally stored in the `ErrorLog` table.
- **Correlation ID**: Every log entry includes the `x-request-id` of the triggering request when available. Logs outside a request context (e.g. startup) omit the ID.

Log format:

```
2026-03-17T10:23:11.042Z | REQUEST | a3f1b2c4-... | /api/v1/auth/login | {"emailOrUsername":"Test"}
2026-03-17T10:23:11.118Z | WARNING | a3f1b2c4-... | /api/v1/auth/login | Invalid email/username or password
```

### 4. Correlation ID

Every request gets a unique ID (`x-request-id`):

- Taken from the incoming request header if present, otherwise auto-generated (UUID v4).
- Returned in the response header so clients can correlate requests.
- Propagated automatically through the entire async call chain via `AsyncLocalStorage` — no manual passing required.

### 5. Security

- `helmet` — HTTP security headers
- `argon2id` — password hashing (OWASP-recommended)
- JWT authentication — short-lived access tokens (`JWT_EXPIRES_IN`) plus a DB-backed refresh token (`REFRESH_TOKEN_EXPIRES_IN_DAYS`) that can be revoked on logout
- Rate limiting — global (100 req/60s) and auth-specific (5 attempts/5 min, 15 min block)
- Zod — input validation on all endpoints
- Request body size limit — 10 kb maximum
- Sensitive fields are **redacted** before logging (`password`, `passwordHash`, `token`, `secret`, `authorization`)
- Password-reset requests never reveal whether an email is registered

### 6. Graceful Shutdown

On `SIGTERM` or `SIGINT` (e.g. Kubernetes, Docker, Ctrl+C):

1. Server stops accepting new requests.
2. In-flight requests are allowed to complete.
3. Database connections are closed cleanly.
4. Controlled `process.exit(0)`.

### 7. Crash Handling

`unhandledRejection` is logged as `CRITICAL` and the process keeps running (a single stray rejection doesn't necessarily mean the server is broken). `uncaughtException` is logged and then the process exits with code 1 — its internal state is no longer trustworthy, so a process manager (systemd, Docker, PM2, ...) should restart it.

### 8. Transactional Emails

`EmailHelper` renders `src/templates/*.html` and sends them via `nodemailer`. Two flows are wired up out of the box:

- **Welcome email** — sent after registration (best-effort: a failed send does not fail registration)
- **Password reset** — `POST /api/v1/auth/request-password-reset` emails a short-lived reset link; `POST /api/v1/auth/reset-password` consumes it

`APP_NAME`, `APP_URL`, and `PRIVACY_URL` fill in the `{{appName}}`, `{{appUrl}}`, `{{privacyUrl}}` placeholders in both templates — replace the templates' copy and styling with your own.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your values.

All variables are validated at startup against a Zod schema (`src/config/env.ts`) — the process exits with a readable error if anything required is missing or malformed.

| Variable                            | Description                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                          | `development` \| `test` \| `production` (default `development`)                           |
| `DBHOST`                            | MySQL host                                                                                |
| `DBPORT`                            | MySQL port                                                                                |
| `DBNAME`                            | Database name                                                                             |
| `DBUSER`                            | Database user                                                                             |
| `DBPASSWORD`                        | Database password                                                                         |
| `SECRETKEYJWT`                      | Secret key for JWT signing                                                                |
| `JWT_EXPIRES_IN`                    | Access token expiry duration (e.g. `1h`, `7d`, `100h`, default `100h`)                    |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS`     | Refresh token lifetime in days (default `30`)                                             |
| `PASSWORD_RESET_EXPIRES_IN_MINUTES` | Password-reset link lifetime in minutes (default `30`)                                    |
| `HTTPPORT`                          | HTTP port (default `9080`)                                                                |
| `CORS_ORIGIN`                       | Allowed CORS origin(s), comma-separated (e.g. `https://example.com`, `*` for development) |
| `LOG_DIR`                           | Directory for log files (optional, defaults to `src/../logs`)                             |
| `SMTP_HOST`                         | SMTP server host                                                                          |
| `SMTP_PORT`                         | SMTP server port (default `587`)                                                          |
| `SMTP_SECURE`                       | `true` for port 465, `false` for STARTTLS (default `false`)                               |
| `SMTP_USER`                         | SMTP auth user                                                                            |
| `SMTP_PASS`                         | SMTP auth password                                                                        |
| `SMTP_FROM`                         | "From" address for outgoing mail (optional, defaults to `SMTP_USER`)                      |
| `APP_NAME`                          | Product name used in email templates (default `Your App`)                                 |
| `APP_URL`                           | Base URL used to build links in emails (default `http://localhost:3000`)                  |
| `PRIVACY_URL`                       | Privacy policy link used in email templates (default `#`)                                 |

---

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE Users (
    userID VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isActive BOOLEAN DEFAULT TRUE
);
```

### RefreshTokens Table

Only a SHA-256 hash of the token is stored, never the raw value.

```sql
CREATE TABLE RefreshTokens (
    tokenID VARCHAR(36) PRIMARY KEY,
    userID VARCHAR(255) NOT NULL,
    tokenHash VARCHAR(64) NOT NULL UNIQUE,
    expiresAt TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
);
```

### ErrorLog Table

```sql
CREATE TABLE ErrorLog (
    errorID INT AUTO_INCREMENT PRIMARY KEY,
    route VARCHAR(255),
    error TEXT,
    level VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🌐 API Routes

All routes are versioned under `/api/v1/`.

| Method   | Route                                 | Auth | Description                                          |
| -------- | ------------------------------------- | ---- | ---------------------------------------------------- |
| `POST`   | `/api/v1/auth/register`               | —    | Register a new user, returns access + refresh tokens |
| `POST`   | `/api/v1/auth/login`                  | —    | Login, returns access + refresh tokens               |
| `POST`   | `/api/v1/auth/refresh`                | —    | Exchange a refresh token for a new access token      |
| `POST`   | `/api/v1/auth/logout`                 | —    | Revoke a refresh token                               |
| `POST`   | `/api/v1/auth/request-password-reset` | —    | Email a password-reset link if the account exists    |
| `POST`   | `/api/v1/auth/reset-password`         | —    | Set a new password using a reset token               |
| `DELETE` | `/api/v1/user/deleteAccount`          | ✅   | Delete the authenticated user's account              |
| `GET`    | `/api/v1/user/getUser`                | ✅   | Fetch user data                                      |
| `GET`    | `/api/v1/system/health`               | —    | Health check (database status)                       |

---

## 🚦 Available Scripts

| Script                 | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run dev`          | Development mode with hot-reload (HTTP, `NODE_ENV=development`)          |
| `npm run build`        | Compile TypeScript to `/dist`                                            |
| `npm run start:local`  | Build and start (development)                                            |
| `npm run start:test`   | Build and start (test)                                                   |
| `npm run start:prod`   | Build and start (production; terminate TLS upstream, e.g. reverse proxy) |
| `npm test`             | Run Jest unit tests                                                      |
| `npm run test:watch`   | Run Jest in watch mode                                                   |
| `npm run lint`         | Check code with ESLint                                                   |
| `npm run lint:fix`     | Check code with ESLint and auto-fix what it can                          |
| `npm run format`       | Format the codebase with Prettier                                        |
| `npm run format:check` | Check formatting without writing changes                                 |

---

## 🧪 Testing

### Unit Tests (Jest)

Tests are located in `tests/unit/` and cover:

- **Utils**: `ApiError`, `HTTPCodes`, `JWTToken`
- **Schemas**: `auth.schema`, `user.schema`
- **Middlewares**: `auth`, `correlationId`, `errorHandler`, `validate`, `rateLimiter`
- **Repositories**: `refreshToken.repository`
- **Services**: `auth.service`, `user.service`

### HTTP Tests

`tests/http/` contains `.http` files for the **REST Client** (JetBrains, VS Code). These let you test endpoints directly from the IDE without external tools like Postman.
