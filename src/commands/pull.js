import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { git } from "../core/git.js";
import { tryAcquire, release } from "../core/lock.js";
import { logsDir, repoPath } from "../core/paths.js";

function ts() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function log(line) {
  fs.mkdirSync(logsDir(), { recursive: true });
  fs.appendFileSync(path.join(logsDir(), "puller.log"), `${ts()} ${line}\n`);
}

export function runPull() {
  const repo = repoPath();
  if (!fs.existsSync(path.join(repo, ".git"))) return;
  if (!tryAcquire()) return;
  try {
    const cfg = loadConfig(repo);
    log("puller start");
    const fetch = git(["fetch", "origin"]);
    if (fetch.code !== 0) log(`fetch non-zero: ${fetch.stderr}`);
    const pull = git(["pull", "--rebase", "--autostash", "origin", cfg.branch]);
    if (pull.code !== 0) log(`pull non-zero: ${pull.stderr}`);
    else if (pull.stdout) log(pull.stdout.split("\n")[0]);
    log("puller done");
  } finally {
    release();
  }
}
