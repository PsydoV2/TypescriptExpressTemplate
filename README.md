# Express + TypeScript Backend Template v2.0

A professional, scalable backend template built with **Express** and **TypeScript**. This project implements a strict **Service-Repository pattern**, central error handling, and a robust logging system with database integration.

---

## 📂 Project Structure

```text
src/
├── config/             # DB Pool & configuration
├── controllers/        # Express route handlers
├── middlewares/        # Auth, Error, Rate Limiting, Logging
├── repositories/       # Data Access Layer (SQL queries)
├── routes/             # API Route definitions
├── services/           # Business logic & Transactions
├── types/              # TypeScript interfaces/DTOs
├── utils/              # Helpers (ApiError, LogHelper, JWT)
└── index.ts            # Entry point
tests/
├── http/               # .http files for REST Client testing
└── unit/               # Jest unit tests for utilities

```

---

## 🗄️ Database Schema

To get the template running, ensure your MySQL database has the following tables:

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
DBPASSWORD=your_pass
SECRETKEYJWT=your_secret
HTTPPORT=9080
HTTPSPORT=9444
CERTKEYPATH=./certs/key.pem
CERTPATH=./certs/cert.pem

```



---

## 🚦 Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development mode with hot-reload (HTTP). |
| `npm run start:local` | Builds and starts in local mode (HTTP). |
| `npm run start:prod` | Builds and starts in production mode (HTTPS). |
| `npm test` | Runs Jest unit tests. |

---

## 🧪 Testing

The template includes two types of testing strategies:

### 1. Unit Tests (Jest)

Located in `tests/unit/utils`, these tests validate core utility logic like `JWTToken`, `ApiError`, and `EnvValidator`.

```bash
npm test

```

### 2. HTTP Request Tests

Located in `tests/http`, these files (`auth.test.http`, `user.test.http`) allow you to test API endpoints directly within VS Code using the **REST Client** extension.

---

## 🛡️ Architecture Highlights

* **Transaction Management**: Handled within the **Service Layer** to ensure atomicity (all-or-nothing) for operations like user registration or deletion.
* **Repository Pattern**: Repositories accept an optional `connection` parameter to participate in transactions initiated by Services.
* **Global Error Handling**: Centralized middleware catches `ApiError` instances, logs them to both files and the database, and returns clean JSON responses.
* **Security**:
* **Rate Limiting**: Brute-force protection via `rate-limiter-flexible`.
* **Headers**: Security headers managed by `Helmet`.
* **CORS**: Fully configurable for frontend integration.



---

## 📝 Logging System

The `LogHelper` automatically routes logs based on severity:

* **File System**: All logs (`INFO`, `REQUEST`, `WARNING`, `ERROR`, `CRITICAL`) are saved as daily rotating `.log` files.
* **Database**: `WARNING`, `ERROR`, and `CRITICAL` severities are additionally persisted in the `ErrorLog` table.
