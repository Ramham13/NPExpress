const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const lockfiles = ["package-lock.json", "yarn.lock"];
const userAgent = process.env.npm_config_user_agent || "";

for (const filename of lockfiles) {
  const target = path.join(repoRoot, filename);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
  }
}

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
