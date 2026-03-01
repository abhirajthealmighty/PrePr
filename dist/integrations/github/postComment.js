import { postPRComment } from "./githubClient.js";
function severityEmoji(severity) {
    switch (severity) {
        case "high": return "🔴";
        case "medium": return "🟡";
        default: return "🟢";
    }
}
export function buildPRComment(violations, metrics, score, breakdown = []) {
    const lines = [];
    lines.push("## 🔍 PrePr Review");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Files changed | ${metrics.filesChanged} |`);
    lines.push(`| Lines added | +${metrics.linesAdded} |`);
    lines.push(`| Lines deleted | -${metrics.linesDeleted} |`);
    lines.push(`| Score | **${score}/100** |`);
    lines.push("");
    if (violations.length === 0) {
        lines.push("✅ **No issues found. Great PR!**");
        return lines.join("\n");
    }
    // Score breakdown table
    if (breakdown.length > 0) {
        lines.push("### 📊 Score Breakdown");
        lines.push("");
        lines.push("| Reason | Penalty |");
        lines.push("|--------|---------|");
        for (const item of breakdown) {
            lines.push(`| ${item.label} | -${item.penalty} |`);
        }
        lines.push(`| **Final Score** | **${score}/100** |`);
        lines.push("");
    }
    // Group by severity
    const grouped = { high: [], medium: [], low: [] };
    for (const v of violations) {
        grouped[v.severity ?? "low"].push(v);
    }
    for (const level of ["high", "medium", "low"]) {
        const items = grouped[level];
        if (!items.length)
            continue;
        const emoji = severityEmoji(level);
        lines.push(`### ${emoji} ${level.toUpperCase()}`);
        lines.push("");
        for (const v of items) {
            if (v.lines && v.lines.length > 0) {
                for (const l of v.lines) {
                    const loc = v.file ? `\`${v.file}:${l.lineNumber}\`` : `line ${l.lineNumber}`;
                    lines.push(`- ${loc} — \`${l.content}\``);
                }
            }
            else {
                const loc = v.file ? ` — \`${v.file}\`` : "";
                lines.push(`- ${v.message}${loc}`);
            }
        }
        lines.push("");
    }
    // Summary counts
    const high = grouped.high.length;
    const medium = grouped.medium.length;
    const low = grouped.low.length;
    lines.push("---");
    lines.push(`**Summary:** 🔴 ${high} high · 🟡 ${medium} medium · 🟢 ${low} low`);
    lines.push("");
    lines.push("---");
    lines.push("_🔍 Risk analyzed by [PrePr](https://github.com/abhirajthealmighty/PrePr) · `npx prepr-cli init` to add to your repo_");
    return lines.join("\n");
}
export async function postGitHubComment(ctx, violations, metrics, score, breakdown = []) {
    const body = buildPRComment(violations, metrics, score, breakdown);
    await postPRComment(ctx, body);
}
//# sourceMappingURL=postComment.js.map