export function parseDiff(diff) {
    const files = [];
    const lines = diff.split("\n");
    let currentFile = null;
    let newLineNumber = 0;
    for (const line of lines) {
        // Detect file
        if (line.startsWith("diff --git")) {
            if (currentFile)
                files.push(currentFile);
            const match = line.match(/b\/(.+)$/);
            currentFile = {
                filePath: match?.[1] ?? "unknown",
                additions: 0,
                deletions: 0,
                lines: []
            };
            continue;
        }
        if (!currentFile)
            continue;
        // HUNK HEADER
        if (line.startsWith("@@")) {
            const match = line.match(/\+(\d+)/);
            newLineNumber = match ? Number(match[1]) : 0;
            continue;
        }
        // Added
        if (line.startsWith("+") && !line.startsWith("+++")) {
            currentFile.additions++;
            currentFile.lines.push({
                type: "added",
                content: line.substring(1),
                lineNumber: newLineNumber++
            });
            continue;
        }
        // Removed
        if (line.startsWith("-") && !line.startsWith("---")) {
            currentFile.deletions++;
            currentFile.lines.push({
                type: "removed",
                content: line.substring(1),
                lineNumber: newLineNumber
            });
            continue;
        }
        // Context line
        if (!line.startsWith("\\")) {
            newLineNumber++;
        }
    }
    if (currentFile)
        files.push(currentFile);
    return { files };
}
//# sourceMappingURL=diffParser.js.map