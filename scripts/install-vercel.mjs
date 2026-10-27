import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const BUN_VERSION = "1.3.14";
const root = resolve(import.meta.dirname, "..");
const lockPath = join(root, "bun.lock");
const original = readFileSync(lockPath, "utf8");
const stage = mkdtempSync(join(tmpdir(), "swsports-install-"));

try {
  for (const name of ["package.json", "bunfig.toml"]) cpSync(join(root, name), join(stage, name));
  const stagedLock = original.replace(
    /https:\/\/europe-west[14]-npm\.pkg\.dev\/lovable-core-prod\/sandbox-npm-cache\//g,
    "https://registry.npmjs.org/",
  );
  writeFileSync(join(stage, "bun.lock"), stagedLock);

  try {
    execFileSync("npx", ["--yes", `bun@${BUN_VERSION}`, "install", "--cwd", stage, "--frozen-lockfile"], {
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(
      `Vercel dependency installation failed with Bun ${BUN_VERSION}; the repository lockfile was left untouched.`,
      { cause: error },
    );
  }

  const stagedModules = join(stage, "node_modules");
  if (!existsSync(stagedModules)) throw new Error("Bun completed without producing staged node_modules");

  cpSync(stagedModules, join(root, "node_modules"), {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
    filter: (src, dst) => {
      if (!existsSync(dst) || lstatSync(src).isSymbolicLink()) return true;
      const a = statSync(src), b = statSync(dst);
      return a.isDirectory() || a.dev !== b.dev || a.ino !== b.ino;
    },
  });
} finally {
  const changed = readFileSync(lockPath, "utf8") !== original;
  if (changed) writeFileSync(lockPath, original);
  rmSync(stage, { recursive: true, force: true });
  if (changed) throw new Error("Repository bun.lock was unexpectedly touched and has been restored");
}
