const DEBUG_PATTERNS = [
    { pattern: /\bdebugger\b/, label: "debugger statement" },
    { pattern: /\bconsole\.(log|debug|info|warn|error|trace)\b/, label: "console statement" },
    { pattern: /\bprintStackTrace\(\)/, label: "printStackTrace()" },
    { pattern: /\bSystem\.out\.print/, label: "System.out.print" },
    { pattern: /\bpprint\b/, label: "pprint (Python debug)" },
    { pattern: /\bdd\(|die\(|var_dump\(/, label: "PHP debug artifact" },
    { pattern: /\bbypass_filters\b|\bwp_die\b/, label: "debug bypass" }
];
export const DebugArtifactRule = {
    name: "debug-artifact",
    description: "Detects debug statements and artifacts that should not be committed (debugger, printStackTrace, etc.)",
    scope: "line",
    enabledByDefault: true,
    check(analysis) {
        const violations = [];
        for (const file of analysis.files) {
            const matchedLines = [];
            for (const line of file.lines) {
                if (line.type !== "added")
                    continue;
                for (const { pattern, label } of DEBUG_PATTERNS) {
                    if (pattern.test(line.content)) {
                        matchedLines.push({
                            lineNumber: line.lineNumber,
                            content: line.content.trim(),
                            label
                        });
                        break; // one violation per line
                    }
                }
            }
            if (matchedLines.length > 0) {
                violations.push({
                    message: `Debug artifacts found at lines ${matchedLines.map(l => l.lineNumber).join(", ")}`,
                    severity: "low",
                    confidence: "high",
                    file: file.filePath,
                    lines: matchedLines.map(l => ({
                        lineNumber: l.lineNumber,
                        content: l.content
                    }))
                });
            }
        }
        return violations;
    }
};
//# sourceMappingURL=debugArtifact.rule.js.map