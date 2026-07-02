import fs from "node:fs";
import path from "node:path";
import { emailTransporter, EMAIL_FROM } from "../config/email.config";
import { LogHelper, LogSeverity } from "./LogHelper";

// ── Types ─────────────────────────────────────────────────────────────────────

type TemplateVariables = Record<string, string>;

interface SendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  variables: TemplateVariables;
}

// ── Template Cache ────────────────────────────────────────────────────────────

const templateCache = new Map<string, string>();

const TEMPLATES_DIR = path.resolve(__dirname, "../templates");

function loadTemplate(templateName: string): string {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Email template "${templateName}" not found at ${filePath}`,
    );
  }

  const content = fs.readFileSync(filePath, "utf-8");
  templateCache.set(templateName, content);
  return content;
}

/**
 * Ersetzt alle {{variablenName}} Platzhalter im Template.
 * Unbekannte Platzhalter bleiben unverändert (kein Crash).
 */
function renderTemplate(html: string, variables: TemplateVariables): string {
  return html.replace(/\{\{(\w+)}}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

// ── EmailHelper ───────────────────────────────────────────────────────────────

export const EmailHelper = {
  async sendEmailFromTemplate({
    to,
    subject,
    templateName,
    variables,
  }: SendEmailOptions): Promise<void> {
    try {
      const rawHtml = loadTemplate(templateName);
      const html = renderTemplate(rawHtml, variables);

      await emailTransporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      await LogHelper.logError(
        `EmailHelper.sendEmailFromTemplate(${templateName})`,
        error,
        LogSeverity.ERROR,
      );
      throw error;
    }
  },

  /**
   * Prüft ob die SMTP-Verbindung funktioniert.
   * Nützlich für Health-Checks beim Server-Start.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await emailTransporter.verify();
      return true;
    } catch (error) {
      await LogHelper.logError(
        "EmailHelper.verifyConnection()",
        error,
        LogSeverity.ERROR,
      );
      return false;
    }
  },
};
