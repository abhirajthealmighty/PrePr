import { isIgnored } from "../core/ignore.js";
const SCOPE_ORDER = ["pr", "file", "line"];
export function runRules(analysis, rules, config) {
    // Filter out ignored files
    const filtered = {
        files: analysis.files.filter(f => !isIgnored(f.filePath, config.ignore))
    };
    // Filter out disabled rules
    const enabledRules = rules.filter(r => config.rules[r.name] !== false);
    const violations = [];
    // Execute rules in scope order: pr → file → line
    for (const scope of SCOPE_ORDER) {
        const scopedRules = enabledRules.filter(r => r.scope === scope);
        for (const rule of scopedRules) {
            rule.check(filtered).forEach(v => violations.push(v));
        }
    }
    return violations;
}
//# sourceMappingURL=runner.js.map