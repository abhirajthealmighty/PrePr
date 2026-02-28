export interface PRMetrics {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

export function analyzeDiff(diff: string): PRMetrics {
  const fileMatches = diff.match(/^diff --git/gm) || [];
  const addedMatches = diff.match(/^\+/gm) || [];
  const deletedMatches = diff.match(/^\-/gm) || [];

  return {
    filesChanged: fileMatches.length,
    linesAdded: addedMatches.length,
    linesDeleted: deletedMatches.length,
  };
}