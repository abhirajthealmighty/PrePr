import type { Rule, Violation } from "./types.js";

export const TodoRule: Rule = {
  name: "todo-detector",
  description: "Detects TODO, FIXME, and HACK comments added in the diff",
  scope: "line",
  enabledByDefault: true,

  check(analysis) {
    const violations: Violation[] = [];

    for (const file of analysis.files) {
      const matchedLines = file.lines.filter(
        line =>
          line.type === "added" &&
          /^\s*(\/\/|#|\/\*|\*)\s*(TODO|FIXME|HACK)/i.test(line.content)
      );

      if (matchedLines.length > 0) {
        violations.push({
          message: `TODO/FIXME found at lines ${matchedLines.map(l => l.lineNumber).join(", ")}`,
          severity: "medium",
          confidence: "high",
          file: file.filePath,
          lines: matchedLines.map(l => ({
            lineNumber: l.lineNumber,
            content: l.content.trim()
          }))
        });
      }
    }

    return violations;
  }
};