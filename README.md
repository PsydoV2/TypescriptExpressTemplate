# Express + TypeScript Backend Template v2.1

A professional, scalable backend template built with **Express** and **TypeScript**. Focuses on a strict **Service-Repository pattern**, type-safe **Zod validation**, and a robust logging system.

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
- `bcrypt` (10 rounds) — password hashing
- JWT authentication — token-based auth with configurable expiry via `JWT_EXPIRES_IN`
- Rate limiting — global (100 req/60s) and auth-specific (5 attempts/5 min, 15 min block)
- Zod — input validation on all endpoints
- Request body size limit — 10 kb maximum
- Sensitive fields are **redacted** before logging (`password`, `passwordHash`, `token`, `secret`, `authorization`)

### 6. Graceful Shutdown

On `SIGTERM` or `SIGINT` (e.g. Kubernetes, Docker, Ctrl+C):

1. Server stops accepting new requests.
2. In-flight requests are allowed to complete.
3. Database connections are closed cleanly.
4. Controlled `process.exit(0)`.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your values.

| Variable | Description |
|---|---|
| `DBHOST` | MySQL host |
| `DBPORT` | MySQL port |
| `DBNAME` | Database name |
| `DBUSER` | Database user |
| `DBPASSWORD` | Database password |
| `SECRETKEYJWT` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | JWT expiry duration (e.g. `1h`, `7d`, `100h`) |
| `HTTPPORT` | HTTP port (development) |
| `HTTPSPORT` | HTTPS port (production) |
| `CERTKEYPATH` | Path to TLS private key |
| `CERTPATH` | Path to TLS certificate |
| `CORS_ORIGIN` | Allowed CORS origin (e.g. `https://example.com`, `*` for development) |

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

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | — | Register a new user |
| `POST` | `/api/v1/auth/login` | — | Login, returns a JWT |
| `DELETE` | `/api/v1/user/deleteAccount` | ✅ | Delete the authenticated user's account |
| `GET` | `/api/v1/user/getUser` | ✅ | Fetch user data |
| `GET` | `/api/v1/system/health` | — | Health check (database status) |

---

## 🚦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development mode with hot-reload (HTTP, `NODE_ENV=development`) |
| `npm run build` | Compile TypeScript to `/dist` |
| `npm run start:local` | Build and start (development) |
| `npm run start:test` | Build and start (test) |
| `npm run start:prod` | Build and start (production, HTTPS) |
| `npm test` | Run Jest unit tests |
| `npm run test:watch` | Run Jest in watch mode |

---

## 🧪 Testing

### Unit Tests (Jest)

Tests are located in `tests/unit/` and cover:

- **Utils**: `ApiError`, `EnvValidator`, `HTTPCodes`, `JWTToken`
- **Schemas**: `auth.schema`, `user.schema`
- **Middlewares**: `auth`, `errorHandler`, `validate`, `rateLimiter`
- **Services**: `auth.service`, `user.service`

### HTTP Tests

`tests/http/` contains `.http` files for the **REST Client** (JetBrains, VS Code). These let you test endpoints directly from the IDE without external tools like Postman.
