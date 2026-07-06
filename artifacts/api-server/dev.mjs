import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: artifactDir,
      env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Command exited from signal ${signal}`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`Command exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

await runNode(["./build.mjs"]);

const server = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: artifactDir,
  env,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  if (!server.killed) {
    server.kill(signal);
  }
};

process.once("SIGINT", () => forwardSignal("SIGINT"));
process.once("SIGTERM", () => forwardSignal("SIGTERM"));

server.once("error", (error) => {
  console.error(error);
  process.exit(1);
});

server.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
