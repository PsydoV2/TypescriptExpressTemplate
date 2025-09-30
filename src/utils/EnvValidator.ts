/**
 * Utility class for validating environment variables.
 * - Ensures that all required keys are defined and not empty.
 * - Exits the process with code 1 if any required variable is missing.
 */
export class EnvValidator {
  static checkEnv(requiredKeys: string[]) {
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
      console.error("❌ Missing or empty environment variables:");
      for (const key of missing) {
        console.error(`  - ${key}`);
      }
      process.exit(1); // Hard exit to prevent app from running with invalid config
    } else {
      console.log("✅ All required environment variables are present.");
    }
  }
}
