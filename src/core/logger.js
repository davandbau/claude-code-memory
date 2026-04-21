import pc from "picocolors";

export function ok(msg) {
  process.stdout.write(`${pc.green("✓")} ${msg}\n`);
}
export function warn(msg) {
  process.stdout.write(`${pc.yellow("!")} ${msg}\n`);
}
export function err(msg) {
  process.stderr.write(`${pc.red("✗")} ${msg}\n`);
}
export function info(msg) {
  process.stdout.write(`${pc.dim("·")} ${msg}\n`);
}
export function heading(msg) {
  process.stdout.write(`\n${pc.bold(msg)}\n`);
}
