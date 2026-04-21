import { spawnSync, spawn } from "node:child_process";
import { repoPath } from "./paths.js";

export function gitSync(args, opts = {}) {
  const cwd = opts.cwd || repoPath();
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    ...opts,
  });
}

export function git(args, opts = {}) {
  const res = gitSync(args, opts);
  return {
    code: res.status ?? -1,
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
  };
}

export function headSha(cwd = repoPath()) {
  const r = git(["rev-parse", "HEAD"], { cwd });
  return r.code === 0 ? r.stdout : "";
}

export function remoteHeadSha(cwd = repoPath(), branch = "main") {
  const r = git(["rev-parse", `origin/${branch}`], { cwd });
  return r.code === 0 ? r.stdout : "";
}

export function hasStaged(cwd = repoPath()) {
  return git(["diff", "--cached", "--quiet"], { cwd }).code !== 0;
}

export function spawnGit(args, opts = {}) {
  const cwd = opts.cwd || repoPath();
  return spawn("git", args, { cwd, stdio: "inherit", env: process.env, ...opts });
}
