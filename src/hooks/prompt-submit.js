import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadConfig } from "../core/config.js";
import { headSha } from "../core/git.js";
import { repoPath, stateDir } from "../core/paths.js";

export function runPromptSubmit(ccmBin) {
  const repo = repoPath();
  if (!fs.existsSync(path.join(repo, ".git"))) return;

  fs.mkdirSync(stateDir(), { recursive: true });
  const cfg = loadConfig(repo);
  const tsFile = path.join(stateDir(), "last-prompt-pull");
  const shaFile = path.join(stateDir(), "last-notified-sha");
  const now = Math.floor(Date.now() / 1000);
  let last = 0;
  try { last = parseInt(fs.readFileSync(tsFile, "utf8"), 10) || 0; } catch {}

  if (now - last >= (cfg.promptSubmit.throttleSeconds ?? 30)) {
    fs.writeFileSync(tsFile, String(now));
    const p = spawn(process.execPath, [ccmBin, "pull"], {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    p.unref();
  }

  if (!cfg.promptSubmit.notifyOnShaChange) return;

  const current = headSha();
  let notified = "";
  try { notified = fs.readFileSync(shaFile, "utf8").trim(); } catch {}

  if (current && notified && current !== notified) {
    fs.writeFileSync(shaFile, current);
    const payload = {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          `Shared memory was updated since last check (HEAD is now ${current}). ` +
          `If relevant to the current task, re-read MEMORY.md and any affected files.`,
      },
    };
    process.stdout.write(JSON.stringify(payload) + "\n");
  }
}
