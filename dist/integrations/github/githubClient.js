export function getGitHubContext() {
    const token = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY; // "owner/repo"
    const prNumber = process.env.PR_NUMBER ??
        process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\//)?.[1];
    if (!token || !repository || !prNumber)
        return null;
    const [owner, repo] = repository.split("/");
    return {
        token,
        owner,
        repo,
        prNumber: parseInt(prNumber, 10)
    };
}
export async function postPRComment(ctx, body) {
    const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/issues/${ctx.prNumber}/comments`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${ctx.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify({ body })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${text}`);
    }
}
//# sourceMappingURL=githubClient.js.map