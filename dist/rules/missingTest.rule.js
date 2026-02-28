export const MissingTestRule = {
    name: "missing-test",
    description: "Warns when source files are changed but no corresponding test files are modified",
    scope: "pr",
    enabledByDefault: true,
    check(analysis) {
        const violations = [];
        const changedPaths = analysis.files.map(f => f.filePath);
        // Source files: src/**/*.ts but not test files
        const sourceFiles = changedPaths.filter(p => /src\//.test(p) &&
            !/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(p) &&
            !/\/__tests__\//.test(p));
        // Test files touched in this PR
        const testFiles = changedPaths.filter(p => /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(p) ||
            /\/__tests__\//.test(p));
        if (sourceFiles.length > 0 && testFiles.length === 0) {
            violations.push({
                message: `${sourceFiles.length} source file(s) modified but no test files updated`,
                severity: "medium",
                confidence: "high"
            });
        }
        return violations;
    }
};
//# sourceMappingURL=missingTest.rule.js.map