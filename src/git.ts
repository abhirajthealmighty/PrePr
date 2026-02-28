import { simpleGit } from "simple-git";

export async function getGitDiff(baseBranch: string = "main"): Promise<string> {
  const git = simpleGit();

  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    throw new Error("Not inside a git repository.");
  }

  const log = await git.log();

  // No commits yet
  if (log.total === 0) {
    return "No commits yet. Make an initial commit first.";
  }

  // Try to diff against the merge-base of the base branch (real PR diff)
  try {
    const result = await git.raw(["merge-base", "HEAD", baseBranch]);
    const mergeBase = result.trim();

    // Get current HEAD commit
    const headResult = await git.raw(["rev-parse", "HEAD"]);
    const head = headResult.trim();

    // If HEAD == mergeBase, we're on the base branch itself — fall back to
    // uncommitted working directory changes
    if (mergeBase === head) {
      return await git.diff(["HEAD"]);
    }

    return await git.diff([`${mergeBase}..HEAD`]);
  } catch {
    // Base branch not found — fall back to uncommitted changes
    return await git.diff(["HEAD"]);
  }
}