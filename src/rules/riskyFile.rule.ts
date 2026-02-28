import type { Rule, Violation } from "./types.js";

const RISKY_PATTERNS = [
  "auth/",
  "payment/",
  "billing/",
  ".env",
  "migration/",
  "database/",
  "config"
];

const INFRA_PATTERNS = [
  "docker/",
  "dockerfile",
  "ci/",
  ".github/workflows"
];

export const RiskyFileRule: Rule = {
  name: "risky-file",

  check(analysis) {
    const violations: Violation[] = [];

    for (const file of analysis.files) {
      const lowerPath = file.filePath.toLowerCase();

      const isInfra = INFRA_PATTERNS.some(p => lowerPath.includes(p));

      if (isInfra) {
        violations.push({
          message: `Infrastructure change detected: ${file.filePath}`,
          severity: "high",
          file: file.filePath
        });
        continue;
      }

      const isRisky = RISKY_PATTERNS.some(p => lowerPath.includes(p));

      if (isRisky) {
        violations.push({
          message: `Risky file modified: ${file.filePath}`,
          severity: "high",
          file: file.filePath
        });
      }
    }

    return violations;
  }
};