import { DiffAnalysis } from "../core/types.js";

export type RuleScope = "pr" | "file" | "line";

export interface ViolationLine {
  lineNumber: number;
  content: string;
}

export interface Violation {
  message: string;
  description?: string;
  severity?: "low" | "medium" | "high";
  confidence?: "low" | "high";
  file?: string;
  line?: number;
  lines?: ViolationLine[];
}

export interface Rule {
  name: string;
  description: string;
  scope: RuleScope;
  enabledByDefault: boolean;
  check(analysis: DiffAnalysis): Violation[];
}
