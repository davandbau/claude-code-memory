import fs from "node:fs";
import { lockDir, stateDir } from "./paths.js";

const STALE_MS = 5 * 60 * 1000;

function ensureStateDir() {
  fs.mkdirSync(stateDir(), { recursive: true });
}

function isStale(dir) {
  try {
    const age = Date.now() - fs.statSync(dir).mtimeMs;
    return age > STALE_MS;
  } catch {
    return false;
  }
}

export async function acquire({ waitMs = 20_000 } = {}) {
  ensureStateDir();
  const dir = lockDir();
  const deadline = Date.now() + waitMs;
  while (true) {
    try {
      fs.mkdirSync(dir);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      if (isStale(dir)) {
        try { fs.rmdirSync(dir); } catch {}
        continue;
      }
      if (Date.now() >= deadline) return false;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

export function release() {
  try { fs.rmdirSync(lockDir()); } catch {}
}

export function tryAcquire() {
  ensureStateDir();
  const dir = lockDir();
  try {
    fs.mkdirSync(dir);
    return true;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    if (isStale(dir)) {
      try { fs.rmdirSync(dir); } catch {}
      try { fs.mkdirSync(dir); return true; } catch {}
    }
    return false;
  }
}
