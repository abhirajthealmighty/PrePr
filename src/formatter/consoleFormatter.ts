import chalk from "chalk";
import { Violation } from "../rules/types.js";

type Severity = "low" | "medium" | "high";

function severityIcon(severity: Severity = "low") {
  switch (severity) {
    case "high":
      return chalk.red("🔴 HIGH");
    case "medium":
      return chalk.yellow("🟡 MEDIUM");
    default:
      return chalk.green("🟢 LOW");
  }
}

export function formatViolations(violations: Violation[]) {
  if (violations.length === 0) {
    console.log(chalk.green("✅ No issues found"));
    return;
  }

  console.log(chalk.bold("\nPrePr Report"));
  console.log("────────────────────────");

  // group by severity
  const grouped: Record<string, Violation[]> = {
    high: [],
    medium: [],
    low: []
  };

  for (const v of violations) {
    grouped[v.severity ?? "low"].push(v);
  }

  (["high", "medium", "low"] as Severity[]).forEach(level => {
    const items = grouped[level];
    if (!items.length) return;

    console.log("\n" + severityIcon(level));

    for (const v of items) {
      if (v.lines && v.lines.length > 0) {
        // Per-line detailed output
        for (const l of v.lines) {
          const location = v.file
            ? chalk.gray(`${v.file}:${l.lineNumber}`)
            : chalk.gray(`line ${l.lineNumber}`);
          console.log("   " + location);
          console.log("      " + chalk.white(l.content));
          console.log("");
        }
      } else {
        // Fallback: single message without line context
        console.log("   " + chalk.white(v.message));
        if (v.file) {
          console.log("   " + chalk.gray(v.file));
        }
        console.log("");
      }
    }
  });
}

export function formatSummary(violations: Violation[]) {
  const counts = { high: 0, medium: 0, low: 0 };

  for (const v of violations) {
    counts[v.severity ?? "low"]++;
  }

  console.log(chalk.bold("Summary"));
  console.log("-------");
  console.log(`High   : ${counts.high}`);
  console.log(`Medium : ${counts.medium}`);
  console.log(`Low    : ${counts.low}`);
}