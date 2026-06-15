export function getGitSourceRef() {
  return (
    process.env.GITLAB_REF?.trim() ||
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    process.env.CI_COMMIT_REF_NAME?.trim() ||
    "main"
  );
}
