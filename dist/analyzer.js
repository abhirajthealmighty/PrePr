export function analyzeDiff(diff) {
    const fileMatches = diff.match(/^diff --git/gm) || [];
    const addedMatches = diff.match(/^\+/gm) || [];
    const deletedMatches = diff.match(/^\-/gm) || [];
    return {
        filesChanged: fileMatches.length,
        linesAdded: addedMatches.length,
        linesDeleted: deletedMatches.length,
    };
}
//# sourceMappingURL=analyzer.js.map