#!/usr/bin/env node

import { Command } from "commander";
import { getGitDiff } from "./git.js";
import chalk from "chalk";

const program = new Command();

program
  .name("prepr")
  .description("PrePr - PR Risk Analyzer")
  .version("0.0.1");

program
  .command("scan")
  .description("Analyze current git changes")
  .action(async () => {
    console.log(chalk.blue("Running PrePr scan...\n"));

    const diff = await getGitDiff();

    console.log(diff || "No changes detected.");
  });

program.parse();