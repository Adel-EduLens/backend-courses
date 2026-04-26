const path = require("path");

module.exports = {
  apps: [
    {
      name: "edulens-nasu-dev",
      script: "index.js",
      cwd: path.join(process.cwd(), "dist"),
      env: {
        NODE_ENV: "development",
        MONGODB_URI:
          "mongodb+srv://mahmoudsayed1612_db_user:IPNznrJb4ct6YO8b@edulens.lhyexky.mongodb.net/nasu",
        JWT_SECRET: "nasu_backend_secret_key_2026",
        PORT: 5005,
      },
    },
  ],
};
