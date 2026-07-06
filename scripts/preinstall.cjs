const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const lockfiles = ["package-lock.json", "yarn.lock"];
const userAgent = process.env.npm_config_user_agent || "";
const currentNodeVersion = process.versions.node;

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function isSupportedNodeVersion(version) {
  const parsed = parseVersion(version);
  if (!parsed) return false;

  if (parsed.major >= 24) return true;
  if (parsed.major === 22) {
    return parsed.minor > 12 || (parsed.minor === 12 && parsed.patch >= 0);
  }
  if (parsed.major === 20) {
    return parsed.minor > 19 || (parsed.minor === 19 && parsed.patch >= 0);
  }
  return false;
}

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

if (!isSupportedNodeVersion(currentNodeVersion)) {
  console.error(
    `Unsupported Node.js version ${currentNodeVersion}. Use Node.js 20.19+, 22.12+, or 24+ for this workspace.`,
  );
  process.exit(1);
}
