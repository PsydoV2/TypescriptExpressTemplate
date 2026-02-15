# Express + TypeScript Backend Template v2.1

A professional, scalable backend template built with **Express** and **TypeScript**. Focuses on a strict **Service-Repository pattern**, type-safe **Zod validation**, and a robust logging system.

---

## 📂 Project Structure

```text
src/
├── config/             # DB Pool & system configurations
├── controllers/        # Express route handlers (Request/Response)
├── middlewares/        # Auth, Error, Rate Limiting, Zod Validation
├── repositories/       # Data Access Layer (SQL queries)
├── routes/             # API Route definitions
├── schemas/            # Zod validation schemas (Single source of truth)
├── services/           # Business logic & Transaction management
├── types/              # TypeScript interfaces/DTOs
├── utils/              # Helpers (ApiError, LogHelper, JWT)
└── index.ts            # Entry point

```

---

## 🛡️ Core Features & Security

### 1. Request Validation (Zod)

Anstatt manueller Checks nutzt dieses Template **Zod-Schemas**. Daten werden validiert, bevor sie den Controller erreichen.

* **Typ-Sicherheit**: Automatische Transformation (z.B. String zu UUID).
* **Zentral**: Schemas liegen in `src/schemas/` und werden per Middleware eingebunden.

### 2. Service-Repository Pattern

* **Services**: Hier liegt die "Intelligenz". Sie verwalten **Datenbank-Transaktionen** (Commit/Rollback), um Datenkonsistenz zu garantieren.
* **Repositories**: Reine Datenbank-Interaktion. Sie wissen nichts von HTTP oder Business-Logik.

### 3. Professional Logging

Der `LogHelper` schreibt nach Schweregrad:

* **Files**: Alle Logs landen in täglichen `.log` Dateien (rotierend).
* **Database**: Kritische Fehler (`WARNING`, `ERROR`, `CRITICAL`) werden zusätzlich in der Tabelle `ErrorLog` gespeichert.

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

## 🚦 Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development mode with hot-reload (HTTP). |
| `npm run build` | Compiles TS to JS in `/dist`. |
| `npm test` | Runs Jest unit tests (Utils, Schemas). |

---

## 🧪 Testing

### Unit Tests (Jest)

Tests befinden sich in `tests/unit`. Sie decken Utilities und vor allem die **Zod-Schemas** ab, um sicherzustellen, dass die Validierungsregeln (z.B. Passwortstärke) greifen.

### HTTP Tests

In `tests/http` findest du `.http` Dateien für den **REST Client**. Damit kannst du Endpoints ohne externe Tools wie Postman testen.
