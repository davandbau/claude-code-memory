import fs from "node:fs";
import path from "node:path";
import { git, headSha, remoteHeadSha } from "../core/git.js";
import { logsDir, repoPath } from "../core/paths.js";
import { serviceStatus } from "../core/services.js";
import { settingsSummary } from "../core/settings.js";
import { heading, info, ok, warn } from "../core/logger.js";

function tail(file, n = 5) {
  try {
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    return lines.slice(-n).join("\n");
  } catch {
    return "";
  }
}

export function runStatus() {
  const repo = repoPath();
  heading("claude-code-memory status");
  info(`repo: ${repo}`);
  if (!fs.existsSync(path.join(repo, ".git"))) {
    warn("not initialized — run: ccm init <git-url>");
    return;
  }

  const local = headSha();
  const remote = remoteHeadSha();
  info(`local HEAD:  ${local || "(none)"}`);
  info(`remote HEAD: ${remote || "(not fetched)"}`);
  if (local && remote && local !== remote) warn("local and remote HEAD diverge — try: ccm sync");
  else if (local && remote) ok("in sync with origin/main");

  heading("services");
  info(serviceStatus());

  heading("Claude Code hooks");
  const hooks = settingsSummary();
  const interesting = ["SessionStart", "UserPromptSubmit"];
  for (const event of interesting) {
    const cmds = hooks[event] || [];
    if (cmds.length) ok(`${event}: ${cmds.join(", ")}`);
    else warn(`${event}: no hook installed`);
  }

  heading("recent watchdog log");
  info(tail(path.join(logsDir(), "watchdog.log")) || "(empty)");

  heading("recent puller log");
  info(tail(path.join(logsDir(), "puller.log")) || "(empty)");
}
