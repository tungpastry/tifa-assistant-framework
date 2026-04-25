const repoRoot =
  process.env.TRADEVIBE_REPO_ROOT || "/home/nexus/projects/tradevibe-org";

module.exports = {
  apps: [
    {
      name: "tradevibe",
      cwd: repoRoot,
      script: `${repoRoot}/start.sh`,
      interpreter: "bash",
      env: {
        HOST: process.env.HOST || "0.0.0.0",
        PORT: process.env.PORT || "3100",
        TRADEVIBE_RUNTIME_DIR:
          process.env.TRADEVIBE_RUNTIME_DIR || `${repoRoot}/runtime`,
        TRADEVIBE_TIMEZONE:
          process.env.TRADEVIBE_TIMEZONE || "Asia/Ho_Chi_Minh",
      },
    },
  ],
};
