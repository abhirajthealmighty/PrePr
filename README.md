# PrePr — Stop Risky Pull Requests Before They Merge

> PrePr analyzes your git diff and predicts PR merge risk before code review begins.

[![npm version](https://img.shields.io/npm/v/prepr-cli.svg)](https://www.npmjs.com/package/prepr-cli)
[![license](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/abhirajthealmighty/PrePr/pulls)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-ready-blue?logo=github-actions)](https://github.com/abhirajthealmighty/PrePr/blob/main/.github/workflows/prepr.yml)
[![PrePr enabled](https://img.shields.io/badge/PrePr-enabled-blueviolet)](https://github.com/abhirajthealmighty/PrePr)

---

## ⚡ See PrePr in Action

![PrePr Demo](https://raw.githubusercontent.com/abhirajthealmighty/PrePr/main/assets/prepr-demo.gif)

---

## One command to get started

```bash
npx prepr-cli init
```

Creates a GitHub Action, config file, and ignore rules in your repo. Open a PR — PrePr runs automatically.

---

## Who is this for?

✅ Teams reviewing large, fast-moving PRs  
✅ Startups without strict review gates  
✅ Security-sensitive services (auth, payments, infra)  
✅ Repos with many contributors and frequent merges  
✅ Any team that has merged a PR that caused a production incident  

---

## Zero config. Any language. Instant results.

⚡ Works on **any language** — diff-based, not AST-based  
⚡ **No repo changes** required to start  
⚡ Runs in **under 2 seconds**  
⚡ **8 built-in rules** covering PR size, risky files, missing tests, debug artifacts  
⚡ **Blocks merge** automatically when HIGH risk detected  

---

## GitHub PR Comment (automatic)

Every PR gets a risk summary posted automatically:

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

Your CI checks show:
```
✅ Tests passed
✅ Build passed
❌ PrePr Risk Analysis — HIGH risk detected
```

---

## What the terminal output looks like

```
Running PrePr scan...

PrePr Report
────────────────────────

🔴 HIGH
   ℹ️ Auth/payment/config files historically cause production incidents.
   Risky file modified: src/auth/loginService.ts

🟡 MEDIUM
   ℹ️ Source changes without test coverage increase regression risk.
   7 source file(s) modified but no test files updated

   src/index.ts:59
      // TODO remove debug logic

Score Breakdown
---------------
Risky file modified            -20
Missing tests                  -10
TODO comments                  -10
────────────────────────────────────
Final Score                55/100

🚨 Needs Attention
   ✓ Request security review for auth/risky changes
   ✓ Add tests for changed modules

🔥 Fix Order (highest impact first)
   1. Request security review for risky file  (+20 pts)
   2. Add tests for changed modules           (+10 pts)
   3. Resolve TODO/FIXME comments             (+10 pts)
```

---

## Try PrePr instantly

Fork this demo repo and open a PR to see PrePr analyze your changes automatically:

👉 **[prepr-demo-risky-pr](https://github.com/abhirajthealmighty/prepr-demo-risky-pr)**

---

## Install

```bash
# No install required — run directly
npx prepr-cli scan

# Or install globally
npm install -g prepr-cli
```

---

## GitHub Action Marketplace

Use PrePr directly as a GitHub Action:

```yaml
- uses: abhirajthealmighty/PrePr@main
  with:
    base-branch: main
    fail-on-high: "true"
```

---

## Setup in your repo

```bash
cd your-project
npx prepr-cli init
```

Creates:
- `.github/workflows/prepr.yml` — GitHub Action that runs on every PR
- `prepr.config.json` — configure rules, base branch, ignored paths
- `.preprignore` — paths to exclude from analysis

Commit these files. PrePr runs automatically on every PR.

---

## Built-in Rules

| Rule | What it detects | Severity |
|------|-----------------|----------|
| `large-pr` | PRs over 300 added lines | 🔴 High |
| `risk-concentration` | One file has >60% of PR changes | 🔴 High |
| `dependency-change` | `package.json`, `go.mod`, `requirements.txt` modified | 🔴 High |
| `risky-file` | Auth, payment, config, infrastructure files modified | 🔴 High |
| `missing-test` | Source changes without test file updates | 🟡 Medium |
| `todo-detector` | TODO/FIXME/HACK in added lines (comment-only) | 🟡 Medium |
| `large-function` | >80 consecutive added lines without a break | 🟡 Medium |
| `debug-artifact` | `console.log`, `debugger`, `printStackTrace` etc. | 🟢 Low |

---

## Configuration

```json
// prepr.config.json
{
  "baseBranch": "main",
  "maxPRLines": 300,
  "ignore": ["dist/", "node_modules/", "coverage/", ".prepr/"],
  "rules": {
    "large-pr": true,
    "missing-test": false,
    "todo-detector": true
  }
}
```

---

## Why PrePr

| Tool | What it checks |
|------|---------------|
| ESLint | Code syntax and style |
| Tests | Functional correctness |
| SonarCloud | Code quality metrics |
| DangerJS | Custom PR rules (config-heavy) |
| **PrePr** | **Merge risk — zero config, any language** |

---

## CLI Reference

```bash
prepr scan                    # Scan current diff vs main
prepr scan --base develop     # Diff against a different branch
prepr scan --html             # Generate .prepr/report.html
prepr scan --format json      # Structured JSON output (for CI)
prepr scan --github           # Post comment to GitHub PR

prepr init                    # Set up PrePr in this repo
prepr install                 # Install pre-push git hook
```

---

## JSON output for custom CI

```bash
prepr scan --format json > prepr-result.json
```

```json
{
  "score": 55,
  "risk": "NEEDS_ATTENTION",
  "riskLabel": "Needs Attention",
  "summary": { "high": 1, "medium": 2, "low": 1 },
  "metrics": { "filesChanged": 14, "linesAdded": 451 },
  "fixPriority": [
    { "action": "Request security review for risky file", "gain": 20 }
  ]
}
```

---

## Contributing

```bash
git clone https://github.com/abhirajthealmighty/PrePr
cd PrePr
npm install
npm run dev      # Run in development
npm run build    # Compile TypeScript
```

PRs welcome — especially new rules, language-specific patterns, and CI integrations.

---

## License

ISC © [abhirajthealmighty](https://github.com/abhirajthealmighty)