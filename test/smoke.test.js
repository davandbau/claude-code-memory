import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, DEFAULT_CONFIG } from "../src/core/config.js";

test("DEFAULT_CONFIG has expected keys", () => {
  assert.ok(DEFAULT_CONFIG.sessionStart);
  assert.ok(Array.isArray(DEFAULT_CONFIG.sessionStart.files));
  assert.equal(DEFAULT_CONFIG.pullIntervalSeconds, 60);
  assert.equal(DEFAULT_CONFIG.debounceSeconds, 5);
});

test("loadConfig returns defaults when no config file", () => {
  const cfg = loadConfig("/tmp/doesnt-exist-" + Date.now());
  assert.equal(cfg.pullIntervalSeconds, 60);
});
