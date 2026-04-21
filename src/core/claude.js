import { spawn, spawnSync } from "node:child_process";

export function claudeInstalled() {
  const r = spawnSync("sh", ["-c", "command -v claude"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim().length > 0;
}

/**
 * Run `claude -p` headlessly, returning a promise of { code, stdout, stderr, timedOut }.
 *
 * - Uses the user's OAuth session (Claude Code MAX). No API key.
 * - Streams stdout/stderr through onLog so logs are captured incrementally.
 * - Kills the child cleanly on timeout (SIGTERM, then SIGKILL after 5s grace).
 * - Forwards SIGINT/SIGTERM from the parent to the child so Ctrl+C works.
 */
export function runClaudePrompt({
  prompt,
  cwd,
  addDirs = [],
  timeoutMs = 600_000,
  model = null,
  permissionMode = "acceptEdits",
  onLog = null,
}) {
  return new Promise((resolve) => {
    const args = [
      "-p",
      "--permission-mode", permissionMode,
    ];
    for (const d of addDirs) {
      args.push("--add-dir", d);
    }
    if (model) {
      args.push("--model", model);
    }
    // Prompt is passed as argv, not shell-expanded, so no injection risk.
    args.push(prompt);

    const child = spawn("claude", args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killTimer = null;

    const hardKill = setTimeout(() => {}, 0); // placeholder
    clearTimeout(hardKill);

    const onTimeout = () => {
      timedOut = true;
      try { child.kill("SIGTERM"); } catch {}
      killTimer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
      }, 5000);
      killTimer.unref?.();
    };
    const timer = setTimeout(onTimeout, timeoutMs);
    timer.unref?.();

    const forwardSig = (sig) => { try { child.kill(sig); } catch {} };
    process.on("SIGINT", forwardSig);
    process.on("SIGTERM", forwardSig);

    child.stdout.on("data", (buf) => {
      const s = buf.toString();
      stdout += s;
      onLog?.("stdout", s);
    });
    child.stderr.on("data", (buf) => {
      const s = buf.toString();
      stderr += s;
      onLog?.("stderr", s);
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      process.off("SIGINT", forwardSig);
      process.off("SIGTERM", forwardSig);
      resolve({ code: -1, stdout, stderr: stderr + `\n${e.message}`, timedOut: false });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      process.off("SIGINT", forwardSig);
      process.off("SIGTERM", forwardSig);
      resolve({
        code: code ?? -1,
        stdout,
        stderr,
        timedOut: timedOut || signal === "SIGTERM" || signal === "SIGKILL",
      });
    });
  });
}
