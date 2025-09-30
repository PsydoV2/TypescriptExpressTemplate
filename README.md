# 🚀 Express + TypeScript Backend Template

A generic backend starter template built with **Express**, **TypeScript**, and **MySQL**.
Includes authentication, user management, middleware, environment validation, logging, and security best practices.

---

## 📂 Project Structure

```
src/
├── config/            # Configuration files (DB connection, etc.)
│   └── DBConnectionPool.ts
├── controllers/       # Route controllers (handle HTTP requests)
│   ├── auth.controller.ts
│   └── user.controller.ts
├── middlewares/       # Express middlewares (auth, error, rate limiters)
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── globalRateLimiter.middleware.ts
│   └── rateLimiter.middleware.ts
├── routes/            # Route definitions
│   ├── auth.routes.ts
│   └── user.routes.ts
├── services/          # Business logic (AuthService, UserService, etc.)
│   ├── auth.service.ts
│   └── user.service.ts
├── types/             # TypeScript types & DTOs
│   └── user.ts
├── utils/             # Utilities (EnvValidator, ApiError, JWT, Logger, etc.)
│   ├── ApiError.ts
│   ├── EnvValidator.ts
│   ├── HTTPCodes.ts
│   ├── JWTToken.ts
│   └── LogHelper.ts
└── index.ts           # Main entry point
```

---

## ⚙️ Features

- ✅ **TypeScript** for type safety
- ✅ **Express** server with modular routes and controllers
- ✅ **MySQL2** connection pool
- ✅ **Authentication (JWT)** with `AuthService` & middleware
- ✅ **User service** with example `deleteAccount` endpoint
- ✅ **Middlewares**:

  - Authentication (`auth.middleware.ts`)
  - Error handling (`error.middleware.ts`)
  - Global rate limiter (`globalRateLimiter.middleware.ts`)
  - Route-specific limiter (`rateLimiter.middleware.ts`)

- ✅ **Security**: `helmet`, `cors`, HTTPS support
- ✅ **Environment validation** with `EnvValidator`
- ✅ **Logging** (file-based + optional DB logging with `LogHelper`)
- ✅ **Scalable structure** for future features

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/express-ts-backend-template.git
cd express-ts-backend-template

# Install dependencies
npm install
```

---

## 🔧 Environment Setup

Create a `.env` file in the project root (see `.env.example`):

```env
DBHOST=localhost
DBPORT=3306
DBNAME=mydatabase
DBUSER=myuser
DBPASSWORD=mypassword

SECRETKEYJWT=supersecretkey

HTTPPORT=9080
HTTPSPORT=9444
```

> The **EnvValidator** ensures that all required variables are set before the server starts.

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

## 🔐 Authentication Flow

- **Register**: `POST /api/register`
- **Login**: `POST /api/login`
- Returns a **JWT token** (valid for 1h)
- Use in requests via `Authorization: Bearer <token>`
- Example protected route:

  - `POST /api/deleteAccount` → requires valid token

---

## 📄 Logging

- Info logs → stored in `/logs/info-YYYY-MM-DD.log`
- Errors → stored in DB table `ErrorLog` (customize for your schema)
- Fallback: errors also logged to console

---

## 🚦 Rate Limiting

- **Global limiter** → 100 requests/minute per IP
- **Auth routes limiter** → 5 attempts per 5 minutes, blocks for 15 minutes after exceeding

---

## 📑 Available Scripts

- `npm run dev` → Start in dev mode (auto-restart, HTTP only)
- `npm run build` → Compile TypeScript to `dist/`
- `npm run start` → Run built server
- `npm run start:local` → Build + run locally via HTTP
- `npm run start:test` → Build + run in production mode (HTTPS)
- `npm run start:prod` → Same as above (for live deployment)

---

## 🛠️ Technologies Used

- [Express](https://expressjs.com/) – Web framework
- [TypeScript](https://www.typescriptlang.org/) – Typed JavaScript
- [MySQL2](https://www.npmjs.com/package/mysql2) – Database driver
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) – JWT authentication
- [bcrypt](https://www.npmjs.com/package/bcrypt) – Password hashing
- [helmet](https://www.npmjs.com/package/helmet) – Security headers
- [cors](https://www.npmjs.com/package/cors) – CORS configuration
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) & [rate-limiter-flexible](https://www.npmjs.com/package/rate-limiter-flexible) – Request limiting
- [dotenv](https://www.npmjs.com/package/dotenv) – Env var management

---

## 🧑‍💻 How to Extend

- Add new routes in `src/routes/` and connect them in `index.ts`
- Add controllers to handle incoming HTTP requests
- Add services to implement business logic
- Add new DTOs in `src/types/` for structured data handling
- Extend `AuthTokenPayload` in `JWTToken.ts` if your JWT should contain more fields

---

## 📜 License

This template is licensed under the **ISC License**.
Feel free to fork and adapt for your own projects.
