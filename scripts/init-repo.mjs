#!/usr/bin/env node
/**
 * Initialize / reset a doc-repo clone:
 * - Verify Node, pnpm, install deps, link harness
 * - Warn if pandoc is missing (needed for export)
 * - Rebuild knowledge/log.md and all index.md files from existing concepts
 * - Never delete or rewrite knowledge concept files
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(root, "knowledge");
const MIN_NODE_MAJOR = 20;
const PNPM_VERSION = "10.11.0";

/** @type {string[]} */
const rewritten = [];
/** @type {string[]} */
const warnings = [];

function rel(p) {
  return path.relative(root, p).replaceAll("\\", "/");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {string} raw
 * @returns {Record<string, string>}
 */
function parseFrontmatterFields(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return {};
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    fields[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return fields;
}

/** @param {string} name */
function humanizeFolder(name) {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function checkNode() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    console.error(`Error: Node.js >= ${MIN_NODE_MAJOR} is required.`);
    console.error(`  Found: v${process.versions.node}`);
    console.error("  Install from https://nodejs.org/ or use a version manager (nvm, fnm).");
    process.exit(1);
  }
  console.log(`✓ Node.js v${process.versions.node}`);
}

/**
 * Quote a single argv token for cmd.exe / POSIX shells.
 * @param {string} value
 */
function shellQuote(value) {
  if (process.platform === "win32") {
    if (/[\s"&<>|^%]/.test(value)) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }
  if (/[^A-Za-z0-9_./:=+-]/.test(value)) {
    return `'${value.replaceAll("'", `'\\''`)}'`;
  }
  return value;
}

/**
 * Spawn with a single shell command string (avoids Node DEP0190).
 * @param {string} bin
 * @param {string[]} args
 * @param {import("node:child_process").SpawnSyncOptionsWithStringEncoding} [opts]
 */
function runShell(bin, args, opts = {}) {
  const command = [bin, ...args].map(shellQuote).join(" ");
  return spawnSync(command, {
    encoding: "utf8",
    shell: true,
    ...opts,
  });
}

function checkPnpm() {
  const result = runShell("pnpm", ["--version"]);
  if (result.status !== 0) {
    console.error("Error: pnpm was not found on PATH.");
    console.error("  Enable via Corepack (ships with Node.js):");
    console.error("    corepack enable");
    console.error(`    corepack prepare pnpm@${PNPM_VERSION} --activate`);
    console.error("  Or see https://pnpm.io/installation");
    process.exit(1);
  }
  const version = (result.stdout || "").trim();
  console.log(`✓ pnpm ${version}`);
}

/**
 * @param {string} label
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
function runPnpm(label, args, opts = {}) {
  console.log(`\n→ ${label}: pnpm ${args.join(" ")}`);
  const result = runShell("pnpm", args, {
    cwd: opts.cwd ?? root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\nError: ${label} failed (exit ${result.status ?? "unknown"}).`);
    console.error(`  Retry: pnpm ${args.join(" ")}`);
    process.exit(1);
  }
}

function checkPandoc() {
  const result = runShell("pandoc", ["--version"]);
  if (result.status !== 0) {
    warnings.push(
      "pandoc not found on PATH — document export (`pnpm convert`) will fail until installed.",
    );
    console.warn("\n⚠ pandoc not found on PATH.");
    console.warn("  Install from https://pandoc.org/installing.html and ensure `pandoc` is on PATH.");
    console.warn("  Continuing init (export is optional for authoring).");
    return false;
  }
  const firstLine = (result.stdout || "").split(/\r?\n/)[0]?.trim() || "pandoc";
  console.log(`✓ ${firstLine}`);
  return true;
}

/**
 * List document packages (subdirs with convert.yaml) under a category folder.
 * @param {string} dir
 * @returns {{ file: string, title: string, description: string }[]}
 */
function listConcepts(dir) {
  if (!existsSync(dir)) return [];
  /** @type {{ file: string, title: string, description: string }[]} */
  const concepts = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".output" || entry.name === "node_modules") continue;
    const pkgDir = path.join(dir, entry.name);
    const cfgPath = path.join(pkgDir, "convert.yaml");
    if (!existsSync(cfgPath)) continue;
    const docPath = path.join(pkgDir, "document.md");
    let fields = {};
    if (existsSync(docPath)) {
      fields = parseFrontmatterFields(readFileSync(docPath, "utf8"));
    } else {
      // Fall back to first markdown source in the package
      const md = readdirSync(pkgDir)
        .filter((n) => n.toLowerCase().endsWith(".md"))
        .sort()[0];
      if (md) {
        fields = parseFrontmatterFields(
          readFileSync(path.join(pkgDir, md), "utf8"),
        );
      }
    }
    concepts.push({
      file: `${entry.name}/`,
      title: fields.title || humanizeFolder(entry.name),
      description: fields.description || "",
    });
  }
  return concepts.sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSubdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function writeLog() {
  const content = `# Bundle Update Log

## ${todayIsoDate()}

* **Initialization**: Bundle indexes and log reset via \`pnpm init-repo\`.
`;
  const target = path.join(bundleRoot, "log.md");
  writeFileSync(target, content, "utf8");
  rewritten.push(rel(target));
}

/**
 * @param {string} folderName
 * @param {{ file: string, title: string, description: string }[]} concepts
 */
function writeFolderIndex(folderName, concepts) {
  const heading = humanizeFolder(folderName);
  const lines = [
    `# ${heading}`,
    "",
    `Concepts in \`${folderName}/\`.`,
    "",
    "## Concepts",
    "",
  ];
  if (concepts.length === 0) {
    lines.push("* (none yet)");
  } else {
    for (const c of concepts) {
      const desc = c.description ? ` — ${c.description}` : "";
      lines.push(`* [${c.title}](${c.file})${desc}`);
    }
  }
  lines.push("");
  const dir = path.join(bundleRoot, folderName);
  mkdirSync(dir, { recursive: true });
  const target = path.join(dir, "index.md");
  writeFileSync(target, lines.join("\n"), "utf8");
  rewritten.push(rel(target));
}

/**
 * @param {string[]} folders
 */
function writeRootIndex(folders) {
  const lines = [
    "---",
    'okf_version: "0.1"',
    "---",
    "",
    "# Knowledge Bundle",
    "",
    "Portable document knowledge for this project. Concepts are document packages (`document.md` + `convert.yaml`) with OKF frontmatter. Prefer bundle-relative links from this root (e.g. `/category/slug/document.md`).",
    "",
    "Indexes were regenerated by `pnpm init-repo`. Concept package files were left unchanged.",
    "",
    "# Domains",
    "",
  ];
  if (folders.length === 0) {
    lines.push("* (no domain folders yet)");
  } else {
    for (const folder of folders) {
      lines.push(`* [${humanizeFolder(folder)}](${folder}/)`);
    }
  }
  lines.push("");
  const target = path.join(bundleRoot, "index.md");
  writeFileSync(target, lines.join("\n"), "utf8");
  rewritten.push(rel(target));
}

function resetIndexesAndLog() {
  if (!existsSync(bundleRoot)) {
    console.error("Error: knowledge/ bundle not found.");
    console.error("  Create a knowledge/ directory before running init-repo.");
    process.exit(1);
  }

  console.log("\n→ Resetting knowledge/log.md and index.md files…");
  writeLog();

  const folders = listSubdirs(bundleRoot);
  for (const folder of folders) {
    const concepts = listConcepts(path.join(bundleRoot, folder));
    writeFolderIndex(folder, concepts);
  }
  writeRootIndex(folders);

  for (const file of rewritten) {
    console.log(`  wrote ${file}`);
  }
}

function runOkfCheck() {
  console.log("\n→ OKF check: pnpm okf:check");
  const result = runShell("pnpm", ["okf:check"], {
    cwd: root,
    stdio: "inherit",
  });
  return result.status === 0;
}

function main() {
  console.log("doc-repo init\n");

  checkNode();
  checkPnpm();
  runPnpm("Install dependencies", ["install"]);
  runPnpm("Link AI harness", ["link-harness"]);
  const pandocOk = checkPandoc();
  resetIndexesAndLog();
  const okfOk = runOkfCheck();

  console.log("\n── Summary ──");
  console.log(`Rewrote ${rewritten.length} file(s):`);
  for (const file of rewritten) console.log(`  - ${file}`);
  console.log(`Pandoc: ${pandocOk ? "ok" : "missing (export unavailable)"}`);
  console.log(`OKF check: ${okfOk ? "ok" : "failed"}`);
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`  - ${w}`);
  }
  console.log(
    "\nConcept Markdown files under knowledge/ were not removed or modified.",
  );

  if (!okfOk) {
    process.exit(1);
  }
  console.log("\nInit complete.");
}

main();
