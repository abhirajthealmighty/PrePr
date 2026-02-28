import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface PreprConfig {
  baseBranch: string;
  maxPRLines: number;
  ignore: string[];
  rules: Record<string, boolean>;
}

const DEFAULTS: PreprConfig = {
  baseBranch: "main",
  maxPRLines: 300,
  ignore: ["dist/", "node_modules/"],
  rules: {}
};

export function loadConfig(cwd: string = process.cwd()): PreprConfig {
  const configPath = join(cwd, "prepr.config.json");

  if (!existsSync(configPath)) return DEFAULTS;

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PreprConfig>;

    return {
      baseBranch: parsed.baseBranch ?? DEFAULTS.baseBranch,
      maxPRLines: parsed.maxPRLines ?? DEFAULTS.maxPRLines,
      ignore: parsed.ignore ?? DEFAULTS.ignore,
      rules: parsed.rules ?? DEFAULTS.rules
    };
  } catch {
    console.warn("Warning: Could not parse prepr.config.json — using defaults.");
    return DEFAULTS;
  }
}