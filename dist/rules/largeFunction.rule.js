const THRESHOLD = 80;
export const LargeFunctionRule = {
    name: "large-function",
    description: `Flags files where more than ${THRESHOLD} consecutive lines were added, suggesting a large function was introduced`,
    scope: "file",
    enabledByDefault: true,
    check(analysis) {
        const violations = [];
        for (const file of analysis.files) {
            const addedLines = file.lines.filter(l => l.type === "added");
            // Count max consecutive added lines (ignoring blank lines)
            let maxRun = 0;
            let currentRun = 0;
            let runStart = 0;
            let maxRunStart = 0;
            for (const line of addedLines) {
                if (line.content.trim() === "") {
                    // Blank line resets the run
                    if (currentRun > maxRun) {
                        maxRun = currentRun;
                        maxRunStart = runStart;
                    }
                    currentRun = 0;
                }
                else {
                    if (currentRun === 0)
                        runStart = line.lineNumber;
                    currentRun++;
                }
            }
            if (currentRun > maxRun) {
                maxRun = currentRun;
                maxRunStart = runStart;
            }
            if (maxRun > THRESHOLD) {
                violations.push({
                    message: `Large block of ${maxRun} added lines starting at line ${maxRunStart} — consider breaking into smaller functions`,
                    severity: "medium",
                    confidence: "low",
                    file: file.filePath
                });
            }
        }
        return violations;
    }
};
//# sourceMappingURL=largeFunction.rule.js.map