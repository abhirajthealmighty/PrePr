import { DiffAnalysis } from "../core/types.js";
import { Rule, Violation } from "./types.js";

export function runRules(
  analysis: DiffAnalysis,
  rules: Rule[]
): Violation[] {
  const violations: Violation[] = [];

  for (const rule of rules) {
    const result = rule.check(analysis);
    result.forEach(v => violations.push(v));
  }

  return violations;
}