#!/usr/bin/env node
/**
 * Wire Claude / Gemini harness paths to the shared .agents trees.
 * Uses junctions on Windows and symlinks elsewhere. Safe to re-run.
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

/** @type {{ link: string, target: string }[]} */
const links = [
  {
    link: path.join(root, ".claude", "skills"),
    target: path.join(root, ".agents", "skills"),
  },
  {
    link: path.join(root, ".claude", "agents"),
    target: path.join(root, ".agents", "agents"),
  },
  {
    link: path.join(root, ".gemini", "agents"),
    target: path.join(root, ".agents", "agents"),
  },
];

function ensureParent(dir) {
  mkdirSync(dir, { recursive: true });
}

function linkOne(linkPath, targetPath) {
  if (!existsSync(targetPath)) {
    console.warn(`skip: missing target ${path.relative(root, targetPath)}`);
    return;
  }

  ensureParent(path.dirname(linkPath));

  if (existsSync(linkPath) || isSymlink(linkPath)) {
    try {
      const stat = lstatSync(linkPath);
      if (stat.isSymbolicLink() || (isWin && stat.isDirectory())) {
        rmSync(linkPath, { recursive: true, force: true });
      } else {
        console.warn(
          `skip: ${path.relative(root, linkPath)} exists and is not a link`,
        );
        return;
      }
    } catch {
      rmSync(linkPath, { recursive: true, force: true });
    }
  }

  const type = isWin ? "junction" : "dir";
  // Relative target keeps the repo portable when possible.
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);
  try {
    symlinkSync(relativeTarget, linkPath, type);
    console.log(
      `linked ${path.relative(root, linkPath)} → ${relativeTarget}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `warn: could not link ${path.relative(root, linkPath)}: ${message}`,
    );
    console.warn(
      "  Manual fallback: ensure Claude/Gemini can read .agents/skills and .agents/agents directly.",
    );
  }
}

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

for (const { link, target } of links) {
  linkOne(link, target);
}
