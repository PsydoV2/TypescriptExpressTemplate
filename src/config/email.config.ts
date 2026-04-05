import nodemailer from "nodemailer";

if (
  !process.env.SMTP_HOST ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASS
) {
  throw new Error(
    "Missing SMTP environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS",
  );
}

export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true", // true → port 465, false → STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const EMAIL_FROM = process.env.SMTP_FROM ?? process.env.SMTP_USER;
