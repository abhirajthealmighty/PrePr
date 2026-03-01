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
  .option("--format <type>", "Output format: text (default) or json")
  .action(async (options) => {
    try {
      // ── Load Config ──────────────────────────────────────────
      const config = loadConfig();
      const baseBranch = options.base ?? config.baseBranch;

      const isJson = options.format === "json";

      if (!isJson) console.log(chalk.cyan("Running PrePr scan...\n"));

      // ── Diff Collection ──────────────────────────────────────
      const diff = await getGitDiff(baseBranch);

      if (!diff || diff.trim().length === 0) {
        if (isJson) {
          process.stdout.write(JSON.stringify({ score: 100, risk: "NONE", riskLabel: "Safe to Merge", summary: { high: 0, medium: 0, low: 0 }, metrics: { filesChanged: 0, linesAdded: 0, linesDeleted: 0 }, violations: [], breakdown: [], fixPriority: [], recommendedActions: [] }, null, 2) + "\n");
        } else {
          console.log(chalk.yellow("No changes detected."));
        }
        process.exit(0);
      }

      // ── Diff Parsing ─────────────────────────────────────────
      const analysis = parseDiff(diff);
      const metrics = analyzeDiff(diff);

      if (!isJson) {
        console.log(chalk.bold("PrePr Metrics"));
        console.log("----------------");
        console.log(`Files changed : ${metrics.filesChanged}`);
        console.log(`Lines added   : +${metrics.linesAdded}`);
        console.log(`Lines deleted : -${metrics.linesDeleted}`);
      }

      // ── Rule Engine ───────────────────────────────────────────
      const violations = runRules(analysis, ALL_RULES, config);

      const { score, breakdown, fixPriority } = calculateScore(violations);
      const recommendation = mergeRecommendation(score, violations);

      // ── JSON Output ───────────────────────────────────────────
      if (options.format === "json") {
        const output = {
          score,
          risk: recommendation.decision.replace(/ /g, "_").toUpperCase(),
          riskLabel: recommendation.decision,
          summary: {
            high: violations.filter(v => v.severity === "high").length,
            medium: violations.filter(v => v.severity === "medium").length,
            low: violations.filter(v => v.severity === "low").length
          },
          metrics: {
            filesChanged: metrics.filesChanged,
            linesAdded: metrics.linesAdded,
            linesDeleted: metrics.linesDeleted
          },
          violations: violations.map(v => ({
            rule: v.message,
            severity: v.severity ?? "low",
            confidence: v.confidence ?? "high",
            file: v.file ?? null,
            lines: v.lines?.map(l => ({ line: l.lineNumber, content: l.content })) ?? []
          })),
          breakdown,
          fixPriority,
          recommendedActions: recommendation.actions
        };
        process.stdout.write(JSON.stringify(output, null, 2) + "\n");
      } else {
        // ── Formatter ─────────────────────────────────────────────
        formatViolations(violations);

        // ── Summary + Score ───────────────────────────────────────
        console.log("");
        formatSummary(violations);

        let scoreColor = chalk.green;
        if (score < 80) scoreColor = chalk.yellow;
        if (score < 60) scoreColor = chalk.red;

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
      }

      // ── GitHub PR Comment ─────────────────────────────────────
      if (options.github) {
        const ctx = getGitHubContext();
        if (!ctx) {
          console.warn(chalk.yellow(
            "⚠️  --github flag set but GITHUB_TOKEN / GITHUB_REPOSITORY / PR_NUMBER not found."
          ));
        } else {
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
    } catch (err: any) {
      console.error(chalk.red("\nPrePr failed ❌"));
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

// ── init command ─────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Initialize PrePr in the current repository")
  .action(() => {
    try {
      const cwd = process.cwd();

      // Write prepr.config.json
      const configPath = join(cwd, "prepr.config.json");
      const config = {
        baseBranch: "main",
        maxPRLines: 300,
        ignore: ["dist/", "node_modules/", "coverage/", ".prepr/"],
        rules: {
          "large-pr": true,
          "risk-concentration": true,
          "missing-test": true,
          "dependency-change": true,
          "risky-file": true,
          "todo-detector": true,
          "debug-artifact": true,
          "large-function": true
        }
      };
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
      console.log(chalk.green("✅ Created prepr.config.json"));

      // Write .preprignore
      const preprignorePath = join(cwd, ".preprignore");
      const preprignore = `dist/
node_modules/
coverage/
.prepr/
.next/
.nuxt/
build/
out/
`;
      writeFileSync(preprignorePath, preprignore, "utf-8");
      console.log(chalk.green("✅ Created .preprignore"));

      // Write .github/workflows/prepr.yml
      const workflowDir = join(cwd, ".github", "workflows");
      mkdirSync(workflowDir, { recursive: true });
      const workflowPath = join(workflowDir, "prepr.yml");
      const workflow = `name: PrePr Risk Analysis

on:
  pull_request:
    branches: ["main", "master"]

jobs:
  prepr:
    name: PR Risk Analysis
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Run PrePr scan
        id: prepr
        run: |
          npx prepr@latest scan --format json --html --base \${{ github.base_ref }} > prepr-result.json || true
          cat prepr-result.json

      - name: Post PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('prepr-result.json', 'utf-8'));

            const riskEmoji = { HIGH: '🚫', MEDIUM: '⚠️', LOW: '🟡', NONE: '✅' };
            const emoji = riskEmoji[report.risk] ?? '🔍';

            const fixes = report.fixPriority
              .map((f, i) => \`\${i + 1}. \${f.action} (+\${f.gain} pts)\`)
              .join('\\n');

            const body = [
              '## 🔍 PrePr Risk Report',
              '',
              \`**Score:** \${report.score}/100  \`,
              \`**Merge Risk:** \${emoji} \${report.riskLabel}\`,
              '',
              \`| Severity | Count |\`,
              \`|----------|-------|\`,
              \`| 🔴 High   | \${report.summary.high} |\`,
              \`| 🟡 Medium | \${report.summary.medium} |\`,
              \`| 🟢 Low    | \${report.summary.low} |\`,
              '',
              fixes ? \`### 🔥 Fix Order\\n\\\`\\\`\\\`\\n\${fixes}\\n\\\`\\\`\\\`\` : '',
              '',
              '> Full HTML report available in workflow artifacts.',
              '_Posted by [PrePr](https://github.com/your-org/prepr) — PR Risk Analyzer_'
            ].join('\\n');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });

      - name: Upload HTML Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: prepr-report
          path: .prepr/report.html
          retention-days: 30

      - name: Fail if HIGH risk
        run: |
          RISK=$(node -e "const r=require('./prepr-result.json'); process.exit(r.summary.high > 0 ? 1 : 0)")
          exit $RISK
`;
      writeFileSync(workflowPath, workflow, "utf-8");
      console.log(chalk.green("✅ Created .github/workflows/prepr.yml"));

      console.log("");
      console.log(chalk.bold("PrePr initialized ✅"));
      console.log(chalk.gray("Next steps:"));
      console.log(chalk.gray("  1. Commit both files to your repository"));
      console.log(chalk.gray("  2. Open a PR — PrePr will run automatically"));
      console.log(chalk.gray("  3. Run locally: prepr scan"));
    } catch (err: any) {
      console.error(chalk.red("Failed to initialize:"), err.message);
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
    } catch (err: any) {
      console.error(chalk.red("Failed to install hook:"), err.message);
      process.exit(1);
    }
  });

program.parse();