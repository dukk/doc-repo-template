#!/usr/bin/env node
/**
 * Convert wrapper: publications use sidecar .meta-data.yml (no Markdown frontmatter).
 * Merges sidecar YAML (excluding `knowledge`) into temp Markdown for doc-convert.
 * Refuses to convert knowledge/ (atoms are not exported).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeRoot = path.join(root, "knowledge");
const publicationsRoot = path.join(root, "publications");

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {string[]} */
  const passthrough = [];
  /** @type {string[]} */
  const positionals = [];
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      help = true;
      passthrough.push(arg);
      continue;
    }
    if (arg === "--format" || arg === "-f" || arg === "--out" || arg === "-o") {
      passthrough.push(arg);
      if (argv[i + 1] !== undefined) {
        passthrough.push(argv[++i]);
      }
      continue;
    }
    if (arg.startsWith("-")) {
      passthrough.push(arg);
      continue;
    }
    positionals.push(arg);
  }

  return {
    help,
    input: positionals[0] ?? "",
    passthrough,
    positionals,
  };
}

function printHelp() {
  console.log(`pnpm convert — export publication packages via Pandoc

Usage:
  pnpm convert <package-or-tree> [--format <fmt[,fmt...]>] [--out <dir>]

Publications live under publications/ (convert.yaml + Markdown + matching
<meta>.meta-data.yml). Sidecar metadata is merged for Pandoc; the knowledge:
key is not passed through.

knowledge/ concepts are not converted. Use publications for exportable docs.

Examples:
  pnpm convert publications/company/operating-model
  pnpm convert --format pdf publications/
`);
}

/**
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
 * @param {string} bin
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
function runShell(bin, args, opts = {}) {
  const command = [bin, ...args].map(shellQuote).join(" ");
  return spawnSync(command, {
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
    cwd: opts.cwd ?? root,
  });
}

/**
 * @param {string} target
 * @param {string} base
 */
function isUnder(target, base) {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkPackageDirs(dir) {
  /** @type {string[]} */
  const pkgs = [];
  if (!existsSync(dir)) return pkgs;
  const cfg = path.join(dir, "convert.yaml");
  if (existsSync(cfg)) pkgs.push(dir);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (
      entry.name === ".output" ||
      entry.name === ".original" ||
      entry.name === "node_modules"
    ) {
      continue;
    }
    pkgs.push(...walkPackageDirs(path.join(dir, entry.name)));
  }
  return pkgs;
}

/**
 * @param {string} pkgDir
 */
function listMarkdownSources(pkgDir) {
  return readdirSync(pkgDir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.toLowerCase().endsWith(".md") &&
        e.name.toLowerCase() !== "index.md" &&
        e.name.toLowerCase() !== "log.md" &&
        e.name.toLowerCase() !== "readme.md",
    )
    .map((e) => e.name);
}

/**
 * Prepend sidecar YAML (minus knowledge) as Markdown frontmatter for convert.
 * @param {string} pkgDir
 */
function preparePublicationPackage(pkgDir) {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "doc-repo-convert-"));
  const tempPkg = path.join(tempRoot, path.basename(pkgDir));
  cpSync(pkgDir, tempPkg, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== ".output" && base !== "node_modules";
    },
  });

  for (const name of listMarkdownSources(tempPkg)) {
    const stem = name.replace(/\.md$/i, "");
    const metaPath = path.join(tempPkg, `${stem}.meta-data.yml`);
    const mdPath = path.join(tempPkg, name);
    if (!existsSync(metaPath)) {
      throw new Error(
        `${path.relative(root, path.join(pkgDir, name)).replaceAll("\\", "/")}: missing ${stem}.meta-data.yml`,
      );
    }
    const meta = parseYaml(readFileSync(metaPath, "utf8")) ?? {};
    if (typeof meta !== "object" || Array.isArray(meta)) {
      throw new Error(`${stem}.meta-data.yml must be a YAML mapping`);
    }
    /** @type {Record<string, unknown>} */
    const pandocMeta = { ...meta };
    delete pandocMeta.knowledge;
    const body = readFileSync(mdPath, "utf8");
    if (/^---\r?\n/.test(body)) {
      throw new Error(
        `${path.relative(root, path.join(pkgDir, name)).replaceAll("\\", "/")}: publication Markdown must not contain frontmatter (use ${stem}.meta-data.yml)`,
      );
    }
    const yamlBlock = stringifyYaml(pandocMeta).trimEnd();
    writeFileSync(mdPath, `---\n${yamlBlock}\n---\n\n${body}`, "utf8");
  }

  return { tempRoot, tempPkg };
}

/**
 * @param {string} tempPkg
 * @param {string} destPkg
 */
function copyOutputsBack(tempPkg, destPkg) {
  const tempOut = path.join(tempPkg, ".output");
  if (!existsSync(tempOut)) return;
  const destOut = path.join(destPkg, ".output");
  rmSync(destOut, { recursive: true, force: true });
  cpSync(tempOut, destOut, { recursive: true });
}

/**
 * @param {string} inputAbs
 * @param {string[]} passthrough
 * @param {string | undefined} outOverride
 */
function convertPublications(inputAbs, passthrough, outOverride) {
  const packages = walkPackageDirs(inputAbs);
  if (packages.length === 0) {
    console.error(
      `Error: No publication packages (convert.yaml) found under ${path.relative(root, inputAbs) || "publications/"}`,
    );
    return 1;
  }

  let failed = false;
  for (const pkgDir of packages) {
    let tempRoot = "";
    try {
      const prepared = preparePublicationPackage(pkgDir);
      tempRoot = prepared.tempRoot;
      /** @type {string[]} */
      const args = [prepared.tempPkg, ...passthrough];
      // When --out is not set, write to temp .output then copy back
      if (outOverride === undefined) {
        // pass through as-is; convert.yaml out is .output relative to temp pkg
      }
      const result = runShell("doc-convert", args, { cwd: root });
      if (result.status !== 0) {
        failed = true;
        continue;
      }
      if (outOverride === undefined) {
        copyOutputsBack(prepared.tempPkg, pkgDir);
        console.log(
          `  outputs copied → ${path.relative(root, path.join(pkgDir, ".output")).replaceAll("\\", "/")}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      failed = true;
    } finally {
      if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
    }
  }
  return failed ? 1 : 0;
}

/**
 * @param {string[]} argv
 */
function main(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.input) {
    printHelp();
    return args.help ? 0 : 1;
  }

  const inputAbs = path.resolve(root, args.input);

  if (isUnder(inputAbs, knowledgeRoot)) {
    console.error(
      "Error: knowledge/ concepts are not converted. Export from publications/ instead.",
    );
    return 1;
  }

  if (isUnder(inputAbs, publicationsRoot)) {
    /** @type {string | undefined} */
    let outOverride;
    for (let i = 0; i < args.passthrough.length; i++) {
      if (
        args.passthrough[i] === "--out" ||
        args.passthrough[i] === "-o"
      ) {
        outOverride = args.passthrough[i + 1];
      }
    }
    return convertPublications(inputAbs, args.passthrough, outOverride);
  }

  // templates/ or other paths: pass through to doc-convert
  const result = runShell("doc-convert", [args.input, ...args.passthrough], {
    cwd: root,
  });
  return result.status ?? 1;
}

process.exit(main(process.argv.slice(2)));
