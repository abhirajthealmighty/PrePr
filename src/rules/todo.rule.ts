import type { Rule, Violation } from "./types.js";

export const TodoRule: Rule = {
  name: "todo-detector",

  check(analysis) {
    const violations: Violation[] = [];

    for (const file of analysis.files) {
      const lines: number[] = [];

      for (const line of file.lines) {
        if (
          line.type === "added" &&
          /TODO|FIXME|HACK/i.test(line.content)
        ) {
          lines.push(line.lineNumber);
        }
      }

      if (lines.length > 0) {
        violations.push({
          message: `TODO/FIXME found at lines ${lines.join(", ")}`,
          severity: "medium",
          file: file.filePath
        });
      }
    }

    return violations;
  }
};