#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { loadConfig } from "./config/loadConfig.js";
import { getGitDiff } from "./git.js";
import { parseDiff } from "./core/diffParser.js";
import { analyzeDiff } from "./analyzer.js";
import { runRules } from "./rules/runner.js";
import { LargePRRule } from "./rules/largePR.rules.js";
import { TodoRule } from "./rules/todo.rule.js";
import { RiskyFileRule } from "./rules/riskyFile.rule.js";
import { MissingTestRule } from "./rules/missingTest.rule.js";
import { DependencyChangeRule } from "./rules/dependencyChange.rule.js";
import { LargeFunctionRule } from "./rules/largeFunction.rule.js";
import { DebugArtifactRule } from "./rules/debugArtifact.rule.js";
import { RiskConcentrationRule } from "./rules/riskConcentration.rule.js";
import { calculateScore, mergeRecommendation } from "./scoring/calculateScore.js";
import { formatViolations, formatSummary } from "./formatter/consoleFormatter.js";
import { getGitHubContext } from "./integrations/github/githubClient.js";
import { postGitHubComment } from "./integrations/github/postComment.js";
import { generateHtmlReport } from "./formatter/htmlFormatter.js";
const ALL_RULES = [
    LargePRRule,
    RiskConcentrationRule,
    MissingTestRule,
    DependencyChangeRule,
    RiskyFileRule,
    TodoRule,
    DebugArtifactRule,
    LargeFunctionRule
];
const program = new Command();
program
    .name("prepr")
    .description("PrePr - PR Risk Analyzer")
    .version("0.0.1");
// ── scan command ──────────────────────────────────────────────────────────────
program
    .command("scan")
    .description("Analyze current git changes")
    .option("--base <branch>", "Base branch to diff against")
    .option("--github", "Post results as a GitHub PR comment")
    .option("--html", "Generate an HTML report at .prepr/report.html")
    .action(async (options) => {
    try {
        // ── Load Config ──────────────────────────────────────────
        const config = loadConfig();
        const baseBranch = options.base ?? config.baseBranch;
        console.log(chalk.cyan("Running PrePr scan...\n"));
        // ── Diff Collection ──────────────────────────────────────
        const diff = await getGitDiff(baseBranch);
        if (!diff || diff.trim().length === 0) {
            console.log(chalk.yellow("No changes detected."));
            process.exit(0);
        }
        // ── Diff Parsing ─────────────────────────────────────────
        const analysis = parseDiff(diff);
        const metrics = analyzeDiff(diff);
        console.log(chalk.bold("PrePr Metrics"));
        console.log("----------------");
        console.log(`Files changed : ${metrics.filesChanged}`);
        console.log(`Lines added   : +${metrics.linesAdded}`);
        console.log(`Lines deleted : -${metrics.linesDeleted}`);
        // ── Rule Engine ───────────────────────────────────────────
        const violations = runRules(analysis, ALL_RULES, config);
        // ── Formatter ─────────────────────────────────────────────
        formatViolations(violations);
        // ── Summary + Score ───────────────────────────────────────
        console.log("");
        formatSummary(violations);
        const { score, breakdown, fixPriority } = calculateScore(violations);
        const recommendation = mergeRecommendation(score, violations);
        let scoreColor = chalk.green;
        if (score < 80)
            scoreColor = chalk.yellow;
        if (score < 60)
            scoreColor = chalk.red;
        console.log(chalk.bold("\nScore Breakdown"));
        console.log("----------------");
        for (const item of breakdown) {
            console.log(`${item.label.padEnd(45)} -${item.penalty}`);
        }
        console.log("─".repeat(52));
        console.log(chalk.bold(`${"Final Score".padEnd(45)} ${scoreColor(`${score}/100`)}`));
        console.log(`\n${recommendation.icon}  ${chalk.bold(recommendation.decision)}`);
        if (recommendation.actions.length > 0) {
            console.log(chalk.gray("   Recommended actions:"));
            recommendation.actions.forEach(a => console.log(chalk.gray(`   ✓ ${a}`)));
        }
        if (fixPriority.length > 0) {
            console.log(chalk.bold("\n🔥 Fix Order (highest impact first)"));
            fixPriority.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.action} ${chalk.gray(`(+${item.gain} pts)`)}`);
            });
        }
        console.log("\n" + chalk.gray("Scan complete ✅"));
        // ── GitHub PR Comment ─────────────────────────────────────
        if (options.github) {
            const ctx = getGitHubContext();
            if (!ctx) {
                console.warn(chalk.yellow("⚠️  --github flag set but GITHUB_TOKEN / GITHUB_REPOSITORY / PR_NUMBER not found."));
            }
            else {
                await postGitHubComment(ctx, violations, metrics, score, breakdown);
                console.log(chalk.green("✅ Posted review comment to GitHub PR"));
            }
        }
        // ── HTML Report ───────────────────────────────────────────
        if (options.html) {
            generateHtmlReport(violations, metrics, score, breakdown, fixPriority);
            console.log(chalk.green("✅ HTML report saved to .prepr/report.html"));
        }
        // ── CI Exit Code ──────────────────────────────────────────
        // Exit with code 1 if any high-severity violations found
        const hasHighViolations = violations.some(v => v.severity === "high");
        if (hasHighViolations) {
            process.exit(1);
        }
    }
    catch (err) {
        console.error(chalk.red("\nPrePr failed ❌"));
        console.error(chalk.red(err.message));
        process.exit(1);
    }
});
// ── install command ───────────────────────────────────────────────────────────
program
    .command("install")
    .description("Install PrePr as a git pre-push hook")
    .action(() => {
    try {
        const hookDir = join(process.cwd(), ".git", "hooks");
        const hookPath = join(hookDir, "pre-push");
        mkdirSync(hookDir, { recursive: true });
        const hookScript = `#!/bin/sh
# PrePr pre-push hook
# Installed by: npx prepr install

echo "Running PrePr scan..."
npx prepr scan
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "PrePr found high-severity violations. Push blocked."
  echo "Fix the issues above or use --no-verify to bypass."
  exit 1
fi

exit 0
`;
        writeFileSync(hookPath, hookScript, { encoding: "utf-8" });
        chmodSync(hookPath, 0o755);
        console.log(chalk.green("✅ PrePr hook installed at .git/hooks/pre-push"));
        console.log(chalk.gray("PrePr will now run automatically before every push."));
        console.log(chalk.gray("To bypass: git push --no-verify"));
    }
    catch (err) {
        console.error(chalk.red("Failed to install hook:"), err.message);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=index.js.map