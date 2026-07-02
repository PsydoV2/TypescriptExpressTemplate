import nodemailer from "nodemailer";
import { env } from "./env";

export const emailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // true → port 465, false → STARTTLS
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const EMAIL_FROM = env.SMTP_FROM ?? env.SMTP_USER;
