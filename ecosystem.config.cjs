module.exports = {
  apps: [
    {
      name: "race-to-pace",
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 5010,
      },
    },
  ],
};
