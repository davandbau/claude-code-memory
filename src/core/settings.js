import fs from "node:fs";
import path from "node:path";
import { claudeSettingsPath, HOME } from "./paths.js";

function loadSettings() {
  const p = claudeSettingsPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`cannot parse ${p}: ${e.message}`);
  }
}

function writeSettings(data) {
  const p = claudeSettingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

function hookEntry(cmd) {
  return { matcher: ".*", hooks: [{ type: "command", command: cmd }] };
}

function hasCommand(groups, cmd) {
  return groups.some((g) => (g.hooks || []).some((h) => h.command === cmd));
}

export function mergeHooks(ccmBin) {
  const data = loadSettings();
  data.hooks ||= {};
  const events = {
    SessionStart: `${ccmBin} hook session-start`,
    UserPromptSubmit: `${ccmBin} hook prompt-submit`,
  };
  let changed = false;
  for (const [event, cmd] of Object.entries(events)) {
    const groups = (data.hooks[event] ||= []);
    if (!hasCommand(groups, cmd)) {
      groups.push(hookEntry(cmd));
      changed = true;
    }
  }
  if (changed) writeSettings(data);
  return changed;
}

export function removeHooks(ccmBin) {
  const data = loadSettings();
  if (!data.hooks) return false;
  const targets = new Set([
    `${ccmBin} hook session-start`,
    `${ccmBin} hook prompt-submit`,
  ]);
  let changed = false;
  for (const event of Object.keys(data.hooks)) {
    const newGroups = [];
    for (const g of data.hooks[event]) {
      const hooks = (g.hooks || []).filter((h) => !targets.has(h.command));
      if (hooks.length !== (g.hooks || []).length) changed = true;
      if (hooks.length) newGroups.push({ ...g, hooks });
    }
    if (newGroups.length) data.hooks[event] = newGroups;
    else delete data.hooks[event];
  }
  if (changed) writeSettings(data);
  return changed;
}

export function settingsSummary() {
  const data = loadSettings();
  const out = {};
  for (const [event, groups] of Object.entries(data.hooks || {})) {
    out[event] = groups.flatMap((g) => (g.hooks || []).map((h) => h.command));
  }
  return out;
}

// Resolve the `ccm` binary path for hook commands. Prefers the resolved
// absolute path so launchd/systemd find it regardless of PATH.
export function resolveCcmBin() {
  if (process.env.CCM_BIN) return process.env.CCM_BIN;
  // When installed globally, `process.argv[1]` is the resolved bin path.
  const argv1 = process.argv[1];
  if (argv1 && argv1.endsWith("cli.js")) return argv1;
  return "ccm";
}
