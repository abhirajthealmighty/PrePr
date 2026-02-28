import type { Rule } from "./types.js";

export const LargePRRule: Rule = {
  name: "large-pr",

  check(analysis) {
    let totalAdditions = 0;

    for (const file of analysis.files) {
      totalAdditions += file.additions;
    }

    if (totalAdditions > 300) {
      return [
        {
          message: "PR too large (>300 lines)",
          severity: "high"
        }
      ];
    }

    return [];
  }
};