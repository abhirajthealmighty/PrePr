export interface ChangedLine {
  type: "added" | "removed";
  content: string;
  lineNumber: number;
}

export interface ChangedFile {
  filePath: string;
  additions: number;
  deletions: number;
  lines: ChangedLine[];
}

export interface DiffAnalysis {
  files: ChangedFile[];
}