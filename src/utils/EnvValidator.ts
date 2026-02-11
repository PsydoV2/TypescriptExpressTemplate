import {LogHelper, LogSeverity} from "./LogHelper";

/**
 * Utility class for validating environment variables.
 * - Ensures that all required keys are defined and not empty.
 * - Exits the process with code 1 if any required variable is missing.
 */
export class EnvValidator {
  static async checkEnv(requiredKeys: string[]) {
    const missing: string[] = [];

    // Check if all required keys are set
    for (const key of requiredKeys) {
      const value = process.env[key];
      if (value === undefined || value.trim() === "") {
        missing.push(key);
      }
    }

    // If some keys are missing, log error and exit
    if (missing.length > 0) {
      let errorMessage: string;

      errorMessage = "❌ Missing or empty environment variables: ";
      errorMessage += missing.join(", ");

      console.error(errorMessage);
      await LogHelper.logError("ENV", errorMessage, LogSeverity.CRITICAL);

      process.exit(1); // Hard exit to prevent app from running with invalid config
    } else {
      const successMessage: string = "✅ All required environment variables are present.";
      console.log(successMessage);
      await LogHelper.logInfo("ENV", successMessage);
    }
  }
}
