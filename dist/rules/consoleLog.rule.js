export const ConsoleLogRule = {
    name: "console-log",
    description: "Detects console statements added in the diff",
    scope: "line",
    enabledByDefault: true,
    check(analysis) {
        const violations = [];
        for (const file of analysis.files) {
            const matchedLines = file.lines.filter(line => line.type === "added" && line.content.includes("console."));
            if (matchedLines.length > 0) {
                violations.push({
                    message: `Console statements found at lines ${matchedLines.map(l => l.lineNumber).join(", ")}`,
                    severity: "low",
                    confidence: "low",
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
//# sourceMappingURL=consoleLog.rule.js.map