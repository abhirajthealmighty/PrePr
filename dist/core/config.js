import { readFileSync, existsSync } from "fs";
import { join } from "path";
const DEFAULTS = {
    baseBranch: "main",
    maxPRLines: 300,
    ignore: ["dist/", "node_modules/"],
    rules: {}
};
export function loadConfig(cwd = process.cwd()) {
    const configPath = join(cwd, "prepr.config.json");
    if (!existsSync(configPath))
        return DEFAULTS;
    try {
        const raw = readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
            baseBranch: parsed.baseBranch ?? DEFAULTS.baseBranch,
            maxPRLines: parsed.maxPRLines ?? DEFAULTS.maxPRLines,
            ignore: parsed.ignore ?? DEFAULTS.ignore,
            rules: parsed.rules ?? DEFAULTS.rules
        };
    }
    catch {
        console.warn("Warning: Could not parse prepr.config.json — using defaults.");
        return DEFAULTS;
    }
}
//# sourceMappingURL=config.js.map