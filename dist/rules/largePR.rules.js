export const LargePRRule = {
    name: "large-pr",
    description: "Flags PRs that exceed the maximum allowed line additions",
    scope: "pr",
    enabledByDefault: true,
    check(analysis) {
        let totalAdditions = 0;
        for (const file of analysis.files) {
            totalAdditions += file.additions;
        }
        if (totalAdditions > 300) {
            return [
                {
                    message: "PR too large (>300 lines)",
                    severity: "high",
                    confidence: "high"
                }
            ];
        }
        return [];
    }
};
//# sourceMappingURL=largePR.rules.js.map