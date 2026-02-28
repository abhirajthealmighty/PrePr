// Human-readable action for each violation message
function toFixAction(message) {
    if (/large pr|too large/i.test(message))
        return "Split PR into smaller, focused changes";
    if (/missing test|no test/i.test(message))
        return "Add tests for changed modules";
    if (/risky file|auth|payment|billing/i.test(message))
        return "Request security review for risky file";
    if (/infrastructure|docker|ci\//i.test(message))
        return "Have infrastructure team review";
    if (/dependency/i.test(message))
        return "Review dependency change for supply chain risk";
    if (/concentration/i.test(message))
        return "Split large file changes into separate PRs";
    if (/todo|fixme|hack/i.test(message))
        return "Resolve TODO/FIXME comments before merge";
    if (/debug|console\./i.test(message))
        return "Remove debug artifacts and console statements";
    if (/large function|large block/i.test(message))
        return "Break large function into smaller units";
    return "Review and address flagged issue";
}
export function calculateScore(violations) {
    let score = 100;
    const breakdown = [];
    for (const v of violations) {
        let penalty;
        switch (v.severity) {
            case "high":
                penalty = 20;
                break;
            case "medium":
                penalty = 10;
                break;
            case "low":
            default: penalty = 5;
        }
        if (v.confidence === "low")
            penalty = Math.floor(penalty / 2);
        score -= penalty;
        breakdown.push({
            label: v.message.length > 50 ? v.message.slice(0, 47) + "..." : v.message,
            penalty
        });
    }
    // Fix priority = sorted descending by penalty (highest ROI first)
    const fixPriority = [...breakdown]
        .sort((a, b) => b.penalty - a.penalty)
        .slice(0, 5)
        .map(item => ({
        action: toFixAction(item.label),
        gain: item.penalty
    }));
    return {
        score: Math.max(score, 0),
        breakdown,
        fixPriority
    };
}
export function mergeRecommendation(score, violations = []) {
    const highViolations = violations.filter(v => v.severity === "high");
    const mediumViolations = violations.filter(v => v.severity === "medium");
    const actions = [];
    if (highViolations.some(v => /large pr/i.test(v.message)))
        actions.push("Reduce PR size below 300 lines");
    if (highViolations.some(v => /risky file|auth/i.test(v.message)))
        actions.push("Request security review for auth/risky changes");
    if (highViolations.some(v => /dependency/i.test(v.message)))
        actions.push("Review dependency changes carefully");
    if (highViolations.some(v => /concentration/i.test(v.message)))
        actions.push("Split large-file changes across PRs");
    if (mediumViolations.some(v => /test/i.test(v.message)))
        actions.push("Add tests for changed modules");
    if (mediumViolations.some(v => /todo/i.test(v.message)))
        actions.push("Resolve TODO/FIXME comments before merge");
    if (score >= 80)
        return { decision: "Safe to Merge", icon: "✅", color: "#22c55e", actions };
    if (score >= 60)
        return { decision: "Review Carefully", icon: "⚠️", color: "#f59e0b", actions };
    if (score >= 40)
        return { decision: "Needs Attention", icon: "🚨", color: "#f97316", actions };
    return { decision: "Block Merge", icon: "❌", color: "#ef4444", actions };
}
//# sourceMappingURL=calculateScore.js.map