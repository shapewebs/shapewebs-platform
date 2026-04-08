import { spawn } from "node:child_process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const turboArgs = ["turbo", "run", "dev", ...process.argv.slice(2)];

let interrupted = false;

const child = spawn(pnpmCommand, turboArgs, {
  stdio: "inherit",
  env: process.env,
});

function forwardSignal(signal) {
  interrupted = true;

  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => {
  forwardSignal("SIGINT");
});

process.on("SIGTERM", () => {
  forwardSignal("SIGTERM");
});

child.on("exit", (code, signal) => {
  if (interrupted || signal === "SIGINT" || signal === "SIGTERM" || code === 130) {
    process.exit(0);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
