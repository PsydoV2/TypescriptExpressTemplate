# Express + TypeScript Backend Template

![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-jest-orange)

A lean, production-minded backend template with **Express**, **TypeScript**, and **MySQL**. It ships with authentication, middleware, environment validation, structured file logging, and a Jest test setup.

---

## 📌 Highlights

- ✅ TypeScript-first codebase
- ✅ Modular Express routes/controllers/services
- ✅ MySQL2 connection pool
- ✅ JWT authentication (login/register)
- ✅ Environment validation before startup
- ✅ File logging per severity (info, request, warning, error, critical)
- ✅ Optional DB logging for errors
- ✅ HTTPS support via certificate paths in `.env`
- ✅ Jest + ts-jest unit tests

---

## 📂 Project Structure (Excerpt)

```
src/
├── config/            # Configuration (DB pool, etc.)
│   └── DBConnectionPool.ts
├── controllers/       # Controllers
├── middlewares/       # Middleware (auth, error, rate limiters)
├── routes/            # Routes
├── services/          # Business logic
├── utils/             # Utilities (EnvValidator, JWT, Logger, etc.)
│   ├── ApiError.ts
│   ├── EnvValidator.ts
│   ├── HTTPCodes.ts
│   ├── JWTToken.ts
│   └── LogHelper.ts
└── index.ts           # Entry point

tests/
└── unit/
    └── utils/
```

---

## ✅ Requirements

- Node.js 18+ (recommended)
- npm
- MySQL (if you want DB logging and database-backed routes)

---

## 📦 Installation

```bash
npm install
```

---

## 🔧 Environment Setup

Create a `.env` file in the project root:

```env
DBHOST=localhost
DBPORT=3306
DBNAME=mydatabase
DBUSER=myuser
DBPASSWORD=mypassword

SECRETKEYJWT=supersecretkey

HTTPPORT=9080
HTTPSPORT=9444

CERTKEYPATH=./key.key
CERTPATH=./fullchain.pem
```

> The `EnvValidator` aborts startup with a **CRITICAL** log if required variables are missing.

---

## ▶️ Usage

### Development (HTTP, auto-reload)

```bash
npm run dev
```

### Local build + run (HTTP)

```bash
npm run start:local
```

### Test / Production (HTTPS)

```bash
npm run start:test
npm run start:prod
```

---

## 🔐 Authentication (Overview)

- **Register**: `POST /api/register`
- **Login**: `POST /api/login`
- Use token: `Authorization: Bearer <token>`
- Protected route example: `POST /api/deleteAccount`

---

## 📄 Logging

**File logs** are written to `logs/`:

- `info-YYYY-MM-DD.log`
- `request-YYYY-MM-DD.log`
- `warning-YYYY-MM-DD.log`
- `error-YYYY-MM-DD.log`
- `critical-YYYY-MM-DD.log`

**DB logging:**
- Only for `warning/error/critical`.
- If DB is not configured or unreachable, logging falls back to files only.

---

## 🧪 Testing (Jest)

```bash
npm test
```

Optional watch mode:

```bash
npm run test:watch
```

Tests live under `tests/` and use `ts-jest`.

---

## 📑 Scripts (Excerpt)

- `npm run dev` → Dev mode (HTTP, autoreload)
- `npm run build` → TypeScript build
- `npm run start:local` → Build + HTTP start
- `npm run start:test` → Build + HTTPS start
- `npm run start:prod` → Build + HTTPS start
- `npm test` → Jest tests

---

## 🛠️ Tech Stack

- Express
- TypeScript
- MySQL2
- jsonwebtoken
- bcrypt
- helmet
- cors
- dotenv
- jest + ts-jest

---

## 🧰 Troubleshooting

**Env variables are reported missing**
- Ensure `.env` is in the project root and the process is started from that folder.

**HTTPS fails to start**
- Verify `CERTKEYPATH` and `CERTPATH` exist and are readable.
