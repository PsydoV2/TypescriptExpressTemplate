# Express + TypeScript Backend Template v2.1

A professional, scalable backend template built with **Express** and **TypeScript**. This version features a strict **Service-Repository pattern**, integrated **Zod validation**, and auto-generated **Swagger documentation**.

---

## 📂 Project Structure

```text
src/
├── config/             # DB Pool, Swagger config
├── controllers/        # Express route handlers
├── middlewares/        # Auth, Error, Rate Limiting, Zod Validation
├── repositories/       # Data Access Layer (SQL queries)
├── routes/             # API Route definitions
├── schemas/            # Zod validation schemas (Source of Truth)
├── services/           # Business logic & Transactions
├── types/              # TypeScript interfaces/DTOs
├── utils/              # Helpers (ApiError, LogHelper, JWT)
└── index.ts            # Entry point
tests/
├── http/               # .http files for REST Client testing
└── unit/               # Jest unit tests (Utils, Schemas, Services)
```

---

## 🗄️ Database Schema

Ensure your MySQL database has the following tables:

### Users Table

```sql
CREATE TABLE Users (
    userID VARCHAR(255) PRIMARY KEY, -- Supports UUIDs
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

## 🛠️ Installation & Setup

1. **Install Dependencies**:
```bash
npm install
```


2. **Configure Environment**:
   Create a `.env` file (see `EnvValidator` for required keys):
```env
DBHOST=localhost
DBPORT=3306
DBNAME=your_db
DBUSER=root
DBPASSWORD=your_password

SECRETKEYJWT=your_super_secret_key
HTTPPORT=9080
HTTPSPORT=9444

CERTKEYPATH=./certs/key.pem
CERTPATH=./certs/cert.pem
```



---

## 🚦 Available Scripts

| Script                | Description                                       |
|-----------------------|---------------------------------------------------|
| `npm run dev`         | Starts development server with hot-reload (HTTP). |
| `npm run build`       | Compiles TypeScript to JavaScript in `/dist`.     |
| `npm run start:local` | Builds and starts in local mode (HTTP).           |
| `npm run start:prod`  | Builds and starts in production mode (HTTPS).     |
| `npm test`            | Runs all Jest unit tests.                         |
---

## 📖 API Documentation (Swagger)

The template automatically generates interactive API documentation.

* **URL**: `http://localhost:9080/api-docs`
* **Features**: Test endpoints directly, view request/response schemas, and manage Bearer Authentication tokens.

---

## 🛡️ Architecture & Security

### Request Validation (Zod)

Incoming data is validated before reaching the controller using a central `validate` middleware.

* Prevents malformed data from entering the business layer.
* Automatically handles type-casting (e.g., strings to numbers).
* Returns descriptive 400 Bad Request errors.

### Transaction Management

Transactions are managed at the **Service Layer**. This ensures that complex operations (like registration or account deletion) are atomic—if one part fails, the entire operation is rolled back.

### Security Features

* **Rate Limiting**: Brute-force protection for Auth routes (`rate-limiter-flexible`).
* **Helmet**: Secure HTTP headers.
* **JWT Auth**: Secure token-based authentication with `userID` injection.

---

## 🧪 Testing

### 1. Unit Tests (Jest)

Located in `tests/unit`.

* **Utils**: Validates logic for JWT, Errors, and Env.
* **Schemas**: Validates Zod rules (e.g., password strength).
* **Services**: Business logic tests with repository mocking.

### 2. HTTP Tests

Located in `tests/http`. Use the **REST Client** (VS Code) to run manual integration tests against the running server.

---

## 📝 Logging System

The `LogHelper` provides a dual-logging strategy:

* **Files**: Daily rotating logs in `logs/` for all severities.
* **Database**: `WARNING`, `ERROR`, and `CRITICAL` logs are mirrored to the `ErrorLog` table for easy monitoring.

<br>