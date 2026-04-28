module.exports = {
  apps: [
    {
      name: "tradevibe-web",
      cwd: process.env.TRADEVIBE_REPO_ROOT || "/home/nexus/projects/tradevibe-org",
      script: "start.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3100",
        TRADEVIBE_RUNTIME_DIR: "runtime",
      },
    },
  ],
};
