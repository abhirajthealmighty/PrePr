import { DiffAnalysis } from "../core/types.js";
import { isIgnored } from "../core/ignore.js";
import { PreprConfig } from "../config/loadConfig.js";
import { Rule, Violation } from "./types.js";

const SCOPE_ORDER = ["pr", "file", "line"] as const;

export function runRules(
  analysis: DiffAnalysis,
  rules: Rule[],
  config: PreprConfig
): Violation[] {
  // Filter out ignored files
  const filtered: DiffAnalysis = {
    files: analysis.files.filter(f => !isIgnored(f.filePath, config.ignore))
  };

  // Filter out disabled rules
  const enabledRules = rules.filter(r => config.rules[r.name] !== false);

  const violations: Violation[] = [];

  // Execute rules in scope order: pr → file → line
  for (const scope of SCOPE_ORDER) {
    const scopedRules = enabledRules.filter(r => r.scope === scope);
    for (const rule of scopedRules) {
      rule.check(filtered).forEach(v => violations.push(v));
    }
  }

  return violations;
}