# PrePr — PR Risk Analyzer

> Stop risky pull requests before they reach production.

[![npm version](https://img.shields.io/npm/v/prepr-cli.svg)](https://www.npmjs.com/package/prepr-cli)
[![license](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![PrePr enabled](https://img.shields.io/badge/PrePr-enabled-blueviolet)](https://github.com/abhirajthealmighty/PrePr)

---

## The Problem

Every team has merged a PR that felt fine — and caused a production incident.

Large PRs are harder to review. Auth changes introduce security gaps. Debug logs leak to production. Tests go missing. No one catches it in time.

**PrePr catches it automatically.**

---

## What PrePr Does

PrePr analyzes your git diff and scores the merge risk of every PR — before it lands in `main`.

```
prepr scan
```

```
PrePr Report
────────────────────────

🔴 HIGH
   Risky file modified: src/auth/loginService.ts

🟡 MEDIUM
   7 source file(s) modified but no test files updated
   src/index.ts:59  // TODO remove debug logic

Score Breakdown
---------------
Risky file modified           -20
Missing tests                 -10
TODO comments                 -10
────────────────────────────────
Final Score               55/100

🚨 Needs Attention
   ✓ Request security review for auth/risky changes
   ✓ Add tests for changed modules

🔥 Fix Order
   1. Request security review for risky file  (+20 pts)
   2. Add tests for changed modules           (+10 pts)
```

---

## Features

| Feature | Description |
|---------|-------------|
| 🔴 Merge Risk Score | 0–100 score with severity breakdown |
| 📋 Rule Engine | 8 built-in rules across PR, file, and line scope |
| 🔍 Evidence | Exact file:line with code content for every violation |
| 🔥 Fix Priority | Sorted list of highest-impact fixes |
| 📊 HTML Report | Dark-themed report with clickable file links |
| 🤖 GitHub PR Comment | Auto-posts review summary on every PR |
| 🚦 CI Exit Codes | Blocks merge when HIGH risk detected |
| ⚙️ Config File | Per-repo `prepr.config.json` for full customization |
| 🪝 Git Hook | Pre-push hook via `prepr install` |

---

## Quick Start

### Local usage

```bash
# Install globally
npm install -g prepr-cli

# Run in any git repo
cd your-project
prepr scan

# Generate HTML report
prepr scan --html && open .prepr/report.html

# Initialize GitHub Action
prepr init
```

### As a one-off (no install)

```bash
npx prepr@latest scan
```

---

## GitHub Actions (Zero Config)

Run `prepr init` in your repo. It creates:

- `.github/workflows/prepr.yml`
- `prepr.config.json`

Commit both files. On every PR you'll see:

```
Checks
✅ Tests
✅ Build
❌ PrePr Risk Analysis — HIGH risk detected
```

And an automatic PR comment:

```
🔍 PrePr Risk Report

Score: 55/100
Merge Risk: 🚫 HIGH

| Severity | Count |
|----------|-------|
| 🔴 High   | 1     |
| 🟡 Medium | 2     |
| 🟢 Low    | 1     |

🔥 Fix Order
1. Request security review for risky file (+20 pts)
2. Add tests for changed modules (+10 pts)
```

---

## Built-in Rules

| Rule | Scope | Severity | What it detects |
|------|-------|----------|-----------------|
| `large-pr` | PR | 🔴 High | PRs exceeding 300 added lines |
| `risk-concentration` | PR | 🔴 High | Single file with >60% of PR changes |
| `missing-test` | PR | 🟡 Medium | Source changes without test file updates |
| `dependency-change` | File | 🔴 High | Changes to `package.json`, `go.mod`, `requirements.txt`, etc. |
| `risky-file` | File | 🔴 High | Auth, payment, config, infrastructure files modified |
| `todo-detector` | Line | 🟡 Medium | TODO/FIXME/HACK comments in added lines |
| `debug-artifact` | Line | 🟢 Low | `console.log`, `debugger`, `printStackTrace`, etc. |
| `large-function` | File | 🟡 Medium | >80 consecutive added lines without a break |

---

## Configuration

```json
// prepr.config.json
{
  "baseBranch": "main",
  "maxPRLines": 300,
  "ignore": ["dist/", "node_modules/", "coverage/"],
  "rules": {
    "large-pr": true,
    "missing-test": false,
    "todo-detector": true
  }
}
```

---

## CLI Reference

```bash
prepr scan                    # Analyze current git diff vs main
prepr scan --base develop     # Diff against a different branch
prepr scan --html             # Generate .prepr/report.html
prepr scan --format json      # Output structured JSON (for CI)
prepr scan --github           # Post comment to GitHub PR

prepr init                    # Create config + GitHub workflow
prepr install                 # Install pre-push git hook
```

---

## JSON Output (CI Integration)

```bash
prepr scan --format json > prepr-result.json
```

```json
{
  "score": 55,
  "risk": "NEEDS_ATTENTION",
  "riskLabel": "Needs Attention",
  "summary": { "high": 1, "medium": 2, "low": 1 },
  "metrics": { "filesChanged": 14, "linesAdded": 451, "linesDeleted": 22 },
  "violations": [...],
  "breakdown": [...],
  "fixPriority": [
    { "action": "Request security review for risky file", "gain": 20 }
  ]
}
```

---

## Comparison

| Tool | What it checks |
|------|---------------|
| ESLint | Code syntax and style |
| Jest / Vitest | Functional correctness |
| SonarCloud | Code quality metrics |
| DangerJS | Custom PR rules (config heavy) |
| **PrePr** | **Merge risk — out of the box** |

PrePr requires zero configuration to start and works on any language (diff-based, not AST-based).

---

## Contributing

```bash
git clone https://github.com/abhirajthealmighty/PrePr
cd prepr
npm install
npm run dev      # Run in development
npm run build    # Compile TypeScript
```

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

ISC © [abhirajthealmighty](https://github.com/abhirajthealmighty)
