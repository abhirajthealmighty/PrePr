import type { Rule, Violation } from "./types.js";

const DEPENDENCY_FILES = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "pom.xml",
  "build.gradle",
  "requirements.txt",
  "Pipfile",
  "Gemfile",
  "go.mod",
  "go.sum",
  "Cargo.toml",
  "Cargo.lock"
];

export const DependencyChangeRule: Rule = {
  name: "dependency-change",
  description: "Flags changes to dependency manifest files which may introduce supply chain risk",
  scope: "file",
  enabledByDefault: true,

  check(analysis) {
    const violations: Violation[] = [];

    for (const file of analysis.files) {
      const fileName = file.filePath.split("/").pop() ?? file.filePath;

      if (DEPENDENCY_FILES.includes(fileName)) {
        violations.push({
          message: `Dependency file modified: ${file.filePath}`,
          severity: "high",
          confidence: "high"
        });
      }
    }

    return violations;
  }
};