import { DiffAnalysis } from "../core/types.js";

export interface Violation {
  message: string;
  severity?: "low" | "medium" | "high";
  file?: string;
  line?: number;
}

export interface Rule {
  name: string;
  check(analysis: DiffAnalysis): Violation[];
}