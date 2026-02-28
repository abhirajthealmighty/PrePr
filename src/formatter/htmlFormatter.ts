import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { Violation } from "../rules/types.js";
import { PRMetrics } from "../analyzer.js";
import { ScoreBreakdownItem, FixPriorityItem, mergeRecommendation } from "../scoring/calculateScore.js";

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Safe";
  if (score >= 60) return "Review Carefully";
  return "Needs Attention";
}

function mergeRisk(violations: Violation[]): { label: string; color: string; icon: string } {
  const high = violations.filter(v => v.severity === "high").length;
  const medium = violations.filter(v => v.severity === "medium").length;

  if (high > 0)   return { label: "HIGH",   color: "#ef4444", icon: "🚫" };
  if (medium > 2) return { label: "MEDIUM", color: "#f59e0b", icon: "⚠️" };
  if (medium > 0) return { label: "LOW",    color: "#f59e0b", icon: "🟡" };
  return                 { label: "NONE",   color: "#22c55e", icon: "✅" };
}

function buildFileLink(file: string, line: number): string {
  if (process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY;
    const sha = process.env.GITHUB_SHA ?? "HEAD";
    return `https://github.com/${repo}/blob/${sha}/${file}#L${line}`;
  }
  return `vscode://file/${process.cwd()}/${file}:${line}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderViolations(violations: Violation[], metrics: PRMetrics): string {
  if (violations.length === 0) {
    return `<p class="no-issues">✅ No issues found — great PR!</p>`;
  }

  const grouped: Record<string, Violation[]> = { high: [], medium: [], low: [] };
  for (const v of violations) grouped[v.severity ?? "low"].push(v);

  const labels: Record<string, string> = {
    high:   "🔴 HIGH",
    medium: "🟡 MEDIUM",
    low:    "🟢 LOW"
  };

  let html = "";

  for (const level of ["high", "medium", "low"] as const) {
    const items = grouped[level];
    if (!items.length) continue;

    // LOW is collapsed by default; HIGH/MEDIUM open
    const isOpen = level !== "low";

    html += `
    <details class="severity-group ${level}" ${isOpen ? "open" : ""}>
      <summary class="severity-summary">
        <span class="badge ${level}">${labels[level]}</span>
        <span class="count">${items.length} issue${items.length !== 1 ? "s" : ""}</span>
        <span class="chevron">▾</span>
      </summary>
      <div class="violation-list">`;

    for (const v of items) {
      html += `<div class="violation">`;

      // Show rule description as visible sub-label if available
      if (v.description) {
        html += `<p class="rule-desc">ℹ️ ${escapeHtml(v.description)}</p>`;
      }

      if (v.lines && v.lines.length > 0) {
        for (const l of v.lines) {
          const href = v.file ? buildFileLink(v.file, l.lineNumber) : "#";
          const loc = v.file ? `${v.file}:${l.lineNumber}` : `line ${l.lineNumber}`;
          html += `
          <div class="violation-line">
            <a href="${href}" class="location" target="_blank">${escapeHtml(loc)}</a>
            <pre class="code">${escapeHtml(l.content)}</pre>
          </div>`;
        }
      } else {
        const fileHint = v.file ? ` <span class="location">${escapeHtml(v.file)}</span>` : "";
        html += `<p class="violation-msg">${escapeHtml(v.message)}${fileHint}</p>`;
      }

      html += `</div>`;
    }

    html += `</div></details>`;
  }

  return html;
}

function renderFixPriority(fixPriority: FixPriorityItem[]): string {
  if (!fixPriority.length) return "";

  let items = "";
  fixPriority.forEach((item, i) => {
    items += `
    <div class="fix-item">
      <span class="fix-num">${i + 1}</span>
      <span class="fix-action">${escapeHtml(item.action)}</span>
      <span class="fix-gain">+${item.gain} pts</span>
    </div>`;
  });

  return `
  <div class="section fix-priority-section">
    <h2>🔥 Fix Order <span class="section-hint">highest impact first</span></h2>
    <div class="fix-list">${items}</div>
  </div>`;
}

function renderBreakdown(breakdown: ScoreBreakdownItem[], score: number): string {
  if (!breakdown.length) return "";

  let rows = "";
  for (const item of breakdown) {
    rows += `<tr><td>${escapeHtml(item.label)}</td><td class="penalty">−${item.penalty}</td></tr>`;
  }

  return `
  <div class="section">
    <h2>Score Breakdown</h2>
    <table class="breakdown-table">
      <tbody>
        ${rows}
        <tr class="total-row"><td><strong>Final Score</strong></td><td class="penalty"><strong>${score}/100</strong></td></tr>
      </tbody>
    </table>
  </div>`;
}

export function generateHtmlReport(
  violations: Violation[],
  metrics: PRMetrics,
  score: number,
  breakdown: ScoreBreakdownItem[] = [],
  fixPriority: FixPriorityItem[] = []
): void {
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const timestamp = new Date().toLocaleString();
  const risk = mergeRisk(violations);
  const recommendation = mergeRecommendation(score, violations);

  const counts = { high: 0, medium: 0, low: 0 };
  for (const v of violations) counts[v.severity ?? "low"]++;

  // Large PR warning
  const largePRWarning = metrics.linesAdded > 300
    ? `<span class="large-warning">⚠️ Large PR</span>`
    : "";

  // Concentration detection
  const totalAdditions = violations
    .filter(v => /concentration/i.test(v.message))
    .length > 0;
  const concentrationMsg = violations.find(v => /concentration/i.test(v.message))?.message ?? "";
  const concentrationCard = concentrationMsg
    ? `
    <div class="card concentration-card">
      <div class="card-label">Change Concentration</div>
      <div class="conc-msg">${escapeHtml(concentrationMsg.split("—")[0].trim())}</div>
      <div class="card-hint" style="color:#f59e0b">⚠️ Single-file dominance detected</div>
    </div>` : "";

  // Estimated review time
  const reviewMins = Math.round(
    (metrics.filesChanged * 3) +
    (metrics.linesAdded / 30) +
    (violations.filter(v => v.severity === "high").length * 10) +
    (totalAdditions ? 10 : 0)
  );
  const reviewRange = `${reviewMins}–${reviewMins + 10} mins`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PrePr Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; max-width: 960px; margin: 0 auto; }

    /* Sticky header */
    .sticky-header { position: sticky; top: 0; z-index: 100; background: #0f172a; border-bottom: 1px solid #1e293b; padding: 0.75rem 0; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .sticky-risk { font-weight: 700; font-size: 0.9rem; color: ${risk.color}; }
    .sticky-score { font-size: 0.9rem; color: #94a3b8; }
    .sticky-score strong { color: ${color}; }
    .sticky-summary { font-size: 0.85rem; color: #64748b; margin-left: auto; }

    /* Banner */
    .risk-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem; font-weight: 600; font-size: 1.1rem; background: color-mix(in srgb, ${risk.color} 12%, #0f172a); border: 1px solid color-mix(in srgb, ${risk.color} 35%, transparent); color: ${risk.color}; }

    h1 { font-size: 1.75rem; color: #f8fafc; margin-bottom: 0.25rem; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }

    /* Metric Cards */
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #1e293b; border-radius: 0.75rem; padding: 1.25rem; }
    .card-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; }
    .card-hint { font-size: 0.75rem; color: #64748b; margin-top: 0.35rem; }
    .score-card .card-value { color: ${color}; font-size: 2.5rem; }
    .score-label { font-size: 0.75rem; margin-top: 0.4rem; color: ${color}; font-weight: 600; }
    .gauge { width: 100%; height: 8px; background: #334155; border-radius: 9999px; margin-top: 0.5rem; overflow: hidden; }
    .gauge-fill { height: 100%; border-radius: 9999px; background: ${color}; width: ${score}%; }
    .large-warning { display: inline-block; font-size: 0.7rem; font-weight: 600; background: #431407; color: #fcd34d; padding: 0.15rem 0.45rem; border-radius: 0.25rem; vertical-align: middle; margin-left: 0.4rem; }

    /* Sections */
    .section { background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }
    .section h2 { font-size: 1rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
    .section-hint { font-size: 0.72rem; color: #475569; font-weight: 400; text-transform: none; letter-spacing: 0; margin-left: 0.5rem; }

    /* Collapsible severity groups */
    .severity-group { margin-bottom: 0.75rem; border-radius: 0.5rem; overflow: hidden; border: 1px solid #1e293b; }
    .severity-summary { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; user-select: none; background: #0f172a; border-radius: 0.5rem; list-style: none; }
    .severity-summary::-webkit-details-marker { display: none; }
    details[open] .severity-summary { border-radius: 0.5rem 0.5rem 0 0; }
    .count { font-size: 0.8rem; color: #64748b; margin-left: auto; }
    .chevron { font-size: 0.75rem; color: #475569; transition: transform 0.15s; }
    details[open] .chevron { transform: rotate(180deg); }
    .violation-list { padding: 1rem; background: #0a1628; border-radius: 0 0 0.5rem 0.5rem; display: flex; flex-direction: column; gap: 0.75rem; }

    /* Badges */
    .badge { font-size: 0.85rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 0.375rem; }
    .badge.high   { background: #450a0a; color: #fca5a5; }
    .badge.medium { background: #431407; color: #fcd34d; }
    .badge.low    { background: #052e16; color: #86efac; }

    /* Violations */
    .violation { border-left: 3px solid #1e293b; padding-left: 1rem; padding-top: 0.25rem; }
    .rule-desc { font-size: 0.78rem; color: #64748b; margin-bottom: 0.5rem; font-style: italic; }
    .violation-line { margin-bottom: 0.5rem; }
    .location { font-size: 0.8rem; color: #38bdf8; font-family: "SF Mono", "Fira Code", monospace; text-decoration: none; display: inline-block; }
    .location:hover { text-decoration: underline; color: #7dd3fc; }
    .code { background: #1e293b; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.83rem; color: #e2e8f0; margin-top: 0.25rem; overflow-x: auto; white-space: pre; font-family: "SF Mono", "Fira Code", monospace; }
    .violation-msg { font-size: 0.9rem; color: #cbd5e1; }
    .no-issues { color: #22c55e; font-size: 1rem; padding: 0.5rem 0; }

    /* Summary */
    .summary-row { display: flex; gap: 1.5rem; font-size: 0.9rem; }
    .summary-row span { color: #94a3b8; }

    footer { margin-top: 2rem; text-align: center; color: #334155; font-size: 0.75rem; }

    /* Recommendation */
    .recommendation { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
    .rec-actions { list-style: none; padding-left: 0.25rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .rec-actions li { font-size: 0.85rem; color: #94a3b8; }

    /* Fix Priority */
    .fix-priority-section { border: 1px solid #1e3a5f; }
    .fix-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .fix-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: #0f172a; border-radius: 0.375rem; }
    .fix-num { width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #1e3a5f; color: #38bdf8; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .fix-action { flex: 1; font-size: 0.875rem; color: #e2e8f0; }
    .fix-gain { font-size: 0.75rem; font-weight: 600; color: #22c55e; font-family: monospace; white-space: nowrap; }

    /* Concentration card */
    .concentration-card { border: 1px solid #431407; }
    .conc-msg { font-size: 0.85rem; color: #fcd34d; margin-top: 0.35rem; font-weight: 600; }

    /* Breakdown table */
    .breakdown-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .breakdown-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #334155; color: #cbd5e1; }
    .breakdown-table .penalty { text-align: right; color: #f87171; font-family: monospace; }
    .breakdown-table .total-row td { border-top: 2px solid #475569; border-bottom: none; color: #f8fafc; padding-top: 0.6rem; }
    .breakdown-table .total-row .penalty { color: ${color}; }
  </style>
</head>
<body>

  <!-- Sticky mini-header (visible while scrolling) -->
  <div class="sticky-header">
    <span class="sticky-risk">${risk.icon} ${risk.label} risk</span>
    <span class="sticky-score">Score: <strong>${score}/100</strong> — ${label}</span>
    <span class="sticky-summary">🔴 ${counts.high} · 🟡 ${counts.medium} · 🟢 ${counts.low}</span>
  </div>

  <h1>🔍 PrePr Report</h1>
  <p class="subtitle">Generated at ${timestamp}</p>

  <!-- Merge Risk Banner -->
  <div class="risk-banner">
    ${risk.icon}&nbsp; Merge Risk: <span style="margin-left:0.25rem">${risk.label}</span>
  </div>

  <!-- Metric Cards -->
  <div class="grid">
    <div class="card score-card">
      <div class="card-label">Score</div>
      <div class="card-value">${score}<span style="font-size:1rem;color:#64748b">/100</span></div>
      <div class="score-label">${label}</div>
      <div class="gauge"><div class="gauge-fill"></div></div>
    </div>
    <div class="card">
      <div class="card-label">Files Changed</div>
      <div class="card-value">${metrics.filesChanged}</div>
    </div>
    <div class="card">
      <div class="card-label">Lines Added</div>
      <div class="card-value" style="color:#22c55e">+${metrics.linesAdded}${largePRWarning}</div>
    </div>
    <div class="card">
      <div class="card-label">Lines Deleted</div>
      <div class="card-value" style="color:#ef4444">-${metrics.linesDeleted}</div>
    </div>
    <div class="card">
      <div class="card-label">Est. Review Time</div>
      <div class="card-value" style="font-size:1.2rem;color:#94a3b8">${reviewRange}</div>
    </div>
    ${concentrationCard}
  </div>

  <!-- Merge Recommendation (actionable) -->
  <div class="section">
    <h2>Recommendation</h2>
    <div class="recommendation" style="color:${recommendation.color}">
      ${recommendation.icon}&nbsp; <strong>${recommendation.decision}</strong>
    </div>
    ${recommendation.actions.length > 0 ? `
    <ul class="rec-actions">
      ${recommendation.actions.map(a => `<li>✓ ${escapeHtml(a)}</li>`).join("")}
    </ul>` : ""}
  </div>

  <!-- Fix Priority -->
  ${renderFixPriority(fixPriority)}

  <!-- Score Breakdown -->
  ${renderBreakdown(breakdown, score)}

  <!-- Summary -->
  <div class="section">
    <h2>Summary</h2>
    <div class="summary-row">
      <span>🔴 High: <strong style="color:#fca5a5">${counts.high}</strong></span>
      <span>🟡 Medium: <strong style="color:#fcd34d">${counts.medium}</strong></span>
      <span>🟢 Low: <strong style="color:#86efac">${counts.low}</strong></span>
    </div>
  </div>

  <!-- Violations -->
  <div class="section">
    <h2>Violations<span class="section-hint">click location to open · LOW collapsed by default</span></h2>
    ${renderViolations(violations, metrics)}
  </div>

  <footer>PrePr — PR Risk Analyzer</footer>
</body>
</html>`;

  const outDir = join(process.cwd(), ".prepr");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.html"), html, "utf-8");
}