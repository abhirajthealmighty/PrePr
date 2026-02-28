import { Rule, Violation } from "./types.js";

export const ConsoleLogRule: Rule = {
  name: "console-log",

  check(analysis) {
    const violations: Violation[] = [];

    for (const file of analysis.files) {
      const lines: number[] = [];

      for (const line of file.lines) {
        if (
          line.type === "added" &&
          line.content.includes("console.")
        ) {
          lines.push(line.lineNumber);
        }
      }

      if (lines.length > 0) {
        violations.push({
          message: `Console statements found at lines ${lines.join(", ")}`,
          severity: "low",
          file: file.filePath
        });
      }
    }

    return violations;
  }
};