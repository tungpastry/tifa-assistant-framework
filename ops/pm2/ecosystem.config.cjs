module.exports = {
  apps: [
    {
      name: "tifa-assistant-web",
      cwd: process.env.TIFA_REPO_ROOT || "/home/nexus/projects/tifa-assistant-framework",
      script: "start.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3100",
        TIFA_RUNTIME_DIR: "runtime",
      },
    },
  ],
};
