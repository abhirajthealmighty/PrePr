import { readFileSync, existsSync } from "fs";
import { join } from "path";
export function loadIgnorePatterns(cwd = process.cwd()) {
    const ignoreFile = join(cwd, ".preprignore");
    if (!existsSync(ignoreFile))
        return [];
    return readFileSync(ignoreFile, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith("#"));
}
export function isIgnored(filePath, patterns) {
    return patterns.some(pattern => {
        // Normalize: strip trailing slash for prefix matching
        const normalized = pattern.endsWith("/")
            ? pattern.slice(0, -1)
            : pattern;
        return filePath.startsWith(normalized) || filePath.includes("/" + normalized + "/");
    });
}
//# sourceMappingURL=ignore.js.map