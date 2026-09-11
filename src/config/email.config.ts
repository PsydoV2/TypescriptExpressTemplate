import nodemailer from "nodemailer";
import { env } from "./env.config";

// nodemailer's defaults (2min connection, 10min socket) are meant for
// large/slow transfers, but would let a stalled/unreachable SMTP server
// hang a request that long — most importantly the health check (see
// EmailHelper.verifyConnection), which should fail fast instead of
// stalling an uptime monitor's request. Keep everything here bounded to a
// few seconds; the templates this app sends are small HTML, no attachments.
const CONNECTION_TIMEOUT_MS = 5_000; // time to establish the TCP connection
const GREETING_TIMEOUT_MS = 5_000; // time to wait for the SMTP greeting
const SOCKET_TIMEOUT_MS = 15_000; // time to wait for any single command/response

export const emailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // true → port 465, false → STARTTLS
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  connectionTimeout: CONNECTION_TIMEOUT_MS,
  greetingTimeout: GREETING_TIMEOUT_MS,
  socketTimeout: SOCKET_TIMEOUT_MS,
});

export const EMAIL_FROM = env.SMTP_FROM ?? env.SMTP_USER;
