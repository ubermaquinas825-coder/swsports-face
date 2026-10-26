import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const stage = mkdtempSync(join(tmpdir(), "swsports-install-"));
try {
  for (const name of ["package.json", "bunfig.toml"]) cpSync(join(root, name), join(stage, name));
  const original = readFileSync(join(root, "bun.lock"), "utf8");
  writeFileSync(join(stage, "bun.lock"), original.replace(/https:\/\/europe-west[14]-npm\.pkg\.dev\/lovable-core-prod\/sandbox-npm-cache\//g, "https://registry.npmjs.org/"));
  execFileSync("npx", ["--yes", "bun@1.3.14", "install", "--cwd", stage, "--frozen-lockfile"], { stdio: "inherit" });
  cpSync(join(stage, "node_modules"), join(root, "node_modules"), {
    recursive: true, force: true, verbatimSymlinks: true,
    filter: (src, dst) => {
      if (!existsSync(dst) || lstatSync(src).isSymbolicLink()) return true;
      const a = statSync(src), b = statSync(dst);
      return a.isDirectory() || a.dev !== b.dev || a.ino !== b.ino;
    },
  });
  if (readFileSync(join(root, "bun.lock"), "utf8") !== original) throw new Error("Repository lockfile unexpectedly changed");
} finally {
  rmSync(stage, { recursive: true, force: true });
}
