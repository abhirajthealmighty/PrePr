import { readFileSync, existsSync } from "fs";
import { join } from "path";
export const defaultConfig = {
    baseBranch: "main",
    maxPRLines: 300,
    ignore: ["dist/", "node_modules/", "coverage/", ".prepr/"],
    rules: {
        "large-pr": true,
        "risky-file": true,
        "todo-detector": true,
        "console-log": true
    }
};
export function loadConfig(cwd = process.cwd()) {
    const configPath = join(cwd, "prepr.config.json");
    if (!existsSync(configPath))
        return defaultConfig;
    try {
        const parsed = JSON.parse(readFileSync(configPath, "utf-8"));
        return {
            ...defaultConfig,
            ...parsed,
            // Deep merge rules so partial overrides work
            rules: { ...defaultConfig.rules, ...(parsed.rules ?? {}) }
        };
    }
    catch {
        console.warn("Warning: Could not parse prepr.config.json — using defaults.");
        return defaultConfig;
    }
}
//# sourceMappingURL=loadConfig.js.map