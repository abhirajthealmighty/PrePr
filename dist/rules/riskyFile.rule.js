const RISKY_PATTERNS = [
    "auth/",
    "payment/",
    "billing/",
    ".env",
    "migration/",
    "database/",
    "config"
];
const INFRA_PATTERNS = [
    "docker/",
    "dockerfile",
    "ci/",
    ".github/workflows"
];
export const RiskyFileRule = {
    name: "risky-file",
    description: "Flags modifications to sensitive files such as auth, payment, config, and infrastructure",
    scope: "file",
    enabledByDefault: true,
    check(analysis) {
        const violations = [];
        for (const file of analysis.files) {
            const lowerPath = file.filePath.toLowerCase();
            const isInfra = INFRA_PATTERNS.some(p => lowerPath.includes(p));
            if (isInfra) {
                violations.push({
                    message: `Infrastructure change detected: ${file.filePath}`,
                    severity: "high",
                    confidence: "high"
                });
                continue;
            }
            const isRisky = RISKY_PATTERNS.some(p => lowerPath.includes(p));
            if (isRisky) {
                violations.push({
                    message: `Risky file modified: ${file.filePath}`,
                    severity: "high",
                    confidence: "high"
                });
            }
        }
        return violations;
    }
};
//# sourceMappingURL=riskyFile.rule.js.map