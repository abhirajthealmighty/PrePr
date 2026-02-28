import type { Rule, Violation } from "./types.js";

const THRESHOLD = 0.6; // 60% of changes in one file

export const RiskConcentrationRule: Rule = {
  name: "risk-concentration",
  description: "Flags when a single file contains the majority of PR changes — high concentration increases review risk",
  scope: "pr",
  enabledByDefault: true,

  check(analysis) {
    const totalAdditions = analysis.files.reduce((sum, f) => sum + f.additions, 0);

    if (totalAdditions === 0) return [];

    const violations: Violation[] = [];

    for (const file of analysis.files) {
      const ratio = file.additions / totalAdditions;

      if (ratio >= THRESHOLD && file.additions >= 50) {
        const pct = Math.round(ratio * 100);
        violations.push({
          message: `${file.filePath} contains ${pct}% of PR changes (${file.additions} lines) — high risk concentration`,
          description: "When one file dominates a PR, reviewers miss context and bugs hide in the noise. Consider splitting the PR.",
          severity: "high",
          confidence: "high",
          file: file.filePath
        });
      }
    }

    return violations;
  }
};