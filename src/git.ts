import simpleGit from "simple-git";

export async function getGitDiff(): Promise<string> {
  const git = simpleGit();

  const diff = await git.diff(["HEAD"]);

  return diff;
}