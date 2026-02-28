#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";

import { getGitDiff } from "./git.js";
import { analyzeDiff } from "./analyzer.js";
import { runRules } from "./rules/runner.js";
import { LargePRRule } from "./rules/largePR.rules.js";
import { calculateScore } from "./scoring/calculateScore.js";
import { parseDiff } from "./core/diffParser.js";
import { ConsoleLogRule } from "./rules/consoleLog.rule.js";
import { TodoRule } from "./rules/todo.rule.js";
import { RiskyFileRule } from "./rules/riskyFile.rule.js";
import { calculateScoreS } from "./auth/loginService.js";

const program = new Command();

program
  .name("prepr")
  .description("PrePr - PR Risk Analyzer")
  .version("0.0.1");

/**
 * prepr scan
 */
program
  .command("scan")
  .description("Analyze current git changes")
  .option("--base <branch>", "Base branch to diff against", "main")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("Running PrePr scan...\n"));

      // -------------------------
      // Get Git Diff
      // -------------------------
      const diff = await getGitDiff(options.base);

      if (!diff || diff.trim().length === 0) {
        console.log(chalk.yellow("No changes detected."));
        process.exit(0);
      }

    //   calculateScoreS("abc");

      // -------------------------
      // Analyze Metrics
      // -------------------------
      const structuredDiff = parseDiff(diff);
      const metrics = analyzeDiff(diff);

      console.log(chalk.bold("PrePr Metrics"));
      console.log("----------------");
      console.log(`Files changed : ${metrics.filesChanged}`);
      console.log(`Lines added   : +${metrics.linesAdded}`);
      console.log(`Lines deleted : -${metrics.linesDeleted}`);

      // TODO remove debug logic
      console.log("debug");

      // -------------------------
      // Run Rules
      // -------------------------
      const violations = runRules(structuredDiff, [
        LargePRRule,
        ConsoleLogRule,
        TodoRule,
        RiskyFileRule
      ]);

      // -------------------------
      // Print Violations
      // -------------------------
      console.log("\n" + chalk.bold("PrePr Violations"));
      console.log("----------------");

      if (violations.length === 0) {
        console.log(chalk.green("✅ No issues found"));
      } else {
        violations.forEach(v =>
            console.log(
                chalk.yellow(
                `⚠️  ${v.message}` +
                (v.file ? ` (${v.file})` : "")
                )
            )
        );
      }

      // -------------------------
      // Calculate Score
      // -------------------------
      const score = calculateScore(violations);

      let scoreColor = chalk.green;
      if (score < 80) scoreColor = chalk.yellow;
      if (score < 60) scoreColor = chalk.red;

      console.log(
        "\n" +
          chalk.bold(
            `PrePr Score: ${scoreColor(`${score}/100`)}`
          )
      );

      console.log("\n" + chalk.gray("Scan complete ✅"));
    } catch (err: any) {
      console.error(chalk.red("\nPrePr failed ❌"));
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

program.parse();