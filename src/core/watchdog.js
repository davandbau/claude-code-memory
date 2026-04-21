import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import chokidar from "chokidar";
import { loadConfig } from "./config.js";
import { git, hasStaged } from "./git.js";
import { acquire, release } from "./lock.js";
import { logsDir, repoPath, stateDir } from "./paths.js";

function ts() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function logLine(line) {
  fs.mkdirSync(logsDir(), { recursive: true });
  fs.appendFileSync(path.join(logsDir(), "watchdog.log"), `${ts()} ${line}\n`);
}

const HOSTNAME = os.hostname().split(".")[0];

async function sync() {
  const acquired = await acquire({ waitMs: 20_000 });
  if (!acquired) {
    logLine("lock busy, skipping");
    return;
  }
  try {
    git(["fetch", "origin"]);
    const pull = git(["pull", "--rebase", "--autostash", "origin", "main"]);
    if (pull.code !== 0) logLine(`pull non-zero (${pull.code}): ${pull.stderr}`);
    git(["add", "-A"]);
    if (!hasStaged()) return;
    const msg = `chore: memory sync ${ts()} [${HOSTNAME}]`;
    const commit = git(["commit", "-m", msg]);
    if (commit.code !== 0) {
      logLine(`commit failed: ${commit.stderr}`);
      return;
    }
    const push = git(["push", "origin", "main"]);
    if (push.code !== 0) {
      logLine(`push failed: ${push.stderr}`);
      return;
    }
    logLine(`synced: ${msg}`);
  } finally {
    release();
  }
}

export function runWatchdog() {
  const cfg = loadConfig();
  const repo = repoPath();
  if (!fs.existsSync(path.join(repo, ".git"))) {
    process.stderr.write(`not a git repo: ${repo}\n`);
    process.exit(1);
  }
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.mkdirSync(logsDir(), { recursive: true });
  logLine(`watchdog up: REPO=${repo} HOST=${HOSTNAME}`);

  const ignored = (p) => {
    const rel = path.relative(repo, p);
    if (!rel || rel.startsWith("..")) return false;
    return cfg.ignore.some(
      (seg) => rel === seg || rel.startsWith(`${seg}${path.sep}`)
    );
  };

  const watcher = chokidar.watch(repo, {
    ignored,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
  });

  let pending = false;
  let lastEvent = 0;
  const debounceMs = (cfg.debounceSeconds ?? 5) * 1000;

  const onEvent = () => {
    pending = true;
    lastEvent = Date.now();
  };
  watcher.on("add", onEvent);
  watcher.on("change", onEvent);
  watcher.on("unlink", onEvent);
  watcher.on("addDir", onEvent);
  watcher.on("unlinkDir", onEvent);

  setInterval(async () => {
    if (!pending) return;
    if (Date.now() - lastEvent < debounceMs) return;
    pending = false;
    try { await sync(); } catch (e) { logLine(`sync crashed: ${e.message}`); }
  }, 1000);

  const shutdown = async (sig) => {
    logLine(`shutdown (${sig})`);
    await watcher.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
