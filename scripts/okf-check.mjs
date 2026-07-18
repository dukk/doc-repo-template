#!/usr/bin/env node
/**
 * OKF v0.1 soft/hard conformance check for knowledge/.
 * Concepts are document packages: convert.yaml + Markdown sources.
 * Hard errors → exit 1. Warnings are printed but non-fatal.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(root, "knowledge");
const RESERVED = new Set(["index.md", "log.md"]);
const DOCUMENT_FILE = "document.md";
const CONVERT_CONFIG_FILE = "convert.yaml";

/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];

function rel(p) {
  return path.relative(root, p).replaceAll("\\", "/");
}

function toPosix(p) {
  return p.replaceAll("\\", "/");
}

function walkMd(dir) {
  /** @type {string[]} */
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".output" || entry.name === ".original" || entry.name === "node_modules") continue;
      files.push(...walkMd(full));
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkDirs(dir) {
  /** @type {string[]} */
  const dirs = [];
  if (!existsSync(dir)) return dirs;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".output" || entry.name === ".original" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    dirs.push(full);
    dirs.push(...walkDirs(full));
  }
  return dirs;
}

/**
 * @param {string} raw
 * @returns {{ frontmatter: string | null, body: string, fields: Record<string, string> }}
 */
function parseDoc(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: raw, fields: {} };
  }
  const frontmatter = match[1] ?? "";
  const body = match[2] ?? "";
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    fields[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { frontmatter, body, fields };
}

function collectLinks(body) {
  const links = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const href = m[1].split(/\s+/)[0]?.replace(/^<|>$/g, "");
    if (href) links.push(href);
  }
  const imgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
  while ((m = imgRe.exec(body)) !== null) {
    const href = m[1].split(/\s+/)[0]?.replace(/^<|>$/g, "");
    if (href) links.push(href);
  }
  return links;
}

function resolveLink(fromFile, href) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#") ||
    href.startsWith("data:")
  ) {
    return null;
  }

  let target;
  if (href.startsWith("/")) {
    target = path.join(bundleRoot, href.replace(/^\//, ""));
  } else {
    target = path.resolve(path.dirname(fromFile), href);
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    const index = path.join(target, "index.md");
    if (existsSync(index)) return index;
    const doc = path.join(target, DOCUMENT_FILE);
    if (existsSync(doc)) return doc;
    const cfg = path.join(target, CONVERT_CONFIG_FILE);
    if (existsSync(cfg)) return cfg;
    return target;
  }
  return target;
}

/**
 * @param {unknown} value
 * @param {string[]} allowed
 * @param {string} label
 * @param {string} pkgRel
 */
function warnEnum(value, allowed, label, pkgRel) {
  if (value === undefined || value === null || value === "") return;
  if (!allowed.includes(String(value))) {
    warnings.push(
      `${pkgRel}: invalid ${label} "${String(value)}" (allowed: ${allowed.join(", ")})`,
    );
  }
}

/**
 * @param {string} pkgDir
 */
function validateConvertConfig(pkgDir) {
  const cfgPath = path.join(pkgDir, CONVERT_CONFIG_FILE);
  const pkgRel = rel(pkgDir);
  let data;
  try {
    data = parseYaml(readFileSync(cfgPath, "utf8")) ?? {};
  } catch (err) {
    errors.push(
      `${rel(cfgPath)}: invalid YAML (${err instanceof Error ? err.message : String(err)})`,
    );
    return;
  }

  const sources = data.sources && typeof data.sources === "object" ? data.sources : {};
  warnEnum(sources.unlisted, ["individual", "ignore", "error"], "sources.unlisted", pkgRel);

  const assets = data.assets && typeof data.assets === "object" ? data.assets : {};
  warnEnum(assets.mode, ["generate", "reference"], "assets.mode", pkgRel);

  const links = data.links && typeof data.links === "object" ? data.links : {};
  warnEnum(links.markdown, ["output", "preserve", "remove"], "links.markdown", pkgRel);
  warnEnum(
    links.missing_target,
    ["warn", "error", "preserve"],
    "links.missing_target",
    pkgRel,
  );

  /** @type {Set<string>} */
  const claimed = new Set();
  /** @type {Set<string>} */
  const names = new Set();

  if (Array.isArray(data.documents)) {
    for (const [index, item] of data.documents.entries()) {
      if (!item || typeof item !== "object") {
        errors.push(`${pkgRel}: documents[${index}] must be an object`);
        continue;
      }
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!name) {
        errors.push(`${pkgRel}: documents[${index}] missing name`);
        continue;
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
        errors.push(`${pkgRel}: documents[${index}].name "${name}" is not a safe basename`);
      }
      if (names.has(name)) {
        errors.push(`${pkgRel}: duplicate document name "${name}"`);
      }
      names.add(name);

      const list = Array.isArray(item.sources) ? item.sources.map(String) : [];
      if (list.length === 0) {
        errors.push(`${pkgRel}: documents[${index}] (${name}) has empty sources`);
      }
      for (const src of list) {
        const normalized = toPosix(src).replace(/^\.\//, "");
        if (claimed.has(normalized)) {
          errors.push(`${pkgRel}: source "${normalized}" listed in multiple documents`);
        }
        claimed.add(normalized);
        const abs = path.resolve(pkgDir, normalized);
        const relToPkg = toPosix(path.relative(pkgDir, abs));
        if (relToPkg.startsWith("..")) {
          errors.push(`${pkgRel}: source escapes package: ${src}`);
          continue;
        }
        if (!existsSync(abs)) {
          errors.push(`${pkgRel}: configured source missing: ${normalized}`);
        }
      }
    }
  }
}

if (!existsSync(bundleRoot)) {
  console.error("Error: knowledge/ bundle not found");
  process.exit(1);
}

// Ensure yaml is resolvable from repo root tooling
let yamlOk = true;
try {
  parseYaml("a: 1");
} catch {
  yamlOk = false;
}
if (!yamlOk) {
  console.error("Error: yaml package unavailable for okf-check");
  process.exit(1);
}

const mdFiles = walkMd(bundleRoot);
const domains = readdirSync(bundleRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const domain of domains) {
  const indexPath = path.join(bundleRoot, domain, "index.md");
  if (!existsSync(indexPath)) {
    warnings.push(`missing domain index: knowledge/${domain}/index.md`);
  }
}

/** @type {Set<string>} */
const packageDirs = new Set();
/** @type {Set<string>} */
const packageSourceFiles = new Set();

for (const dir of walkDirs(bundleRoot)) {
  const cfgPath = path.join(dir, CONVERT_CONFIG_FILE);
  if (!existsSync(cfgPath)) continue;
  packageDirs.add(path.normalize(dir));
  validateConvertConfig(dir);

  // Collect markdown sources inside package (excluding nested packages)
  for (const file of walkMd(dir)) {
    const parentPkg = [...packageDirs].find(
      (pkg) =>
        path.normalize(file).startsWith(path.normalize(pkg) + path.sep) ||
        path.normalize(file) === path.normalize(pkg),
    );
    // Only attribute to this package if nearest package is this dir
    let nearest = dir;
    let cursor = path.dirname(file);
    while (true) {
      if (existsSync(path.join(cursor, CONVERT_CONFIG_FILE))) {
        nearest = cursor;
        break;
      }
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
    if (path.normalize(nearest) !== path.normalize(dir)) continue;
    if (RESERVED.has(path.basename(file))) continue;
    packageSourceFiles.add(path.normalize(file));
  }
}

for (const file of mdFiles) {
  const name = path.basename(file);
  const raw = readFileSync(file, "utf8");
  const { frontmatter, body, fields } = parseDoc(raw);
  const isReserved = RESERVED.has(name);
  const isRootIndex =
    path.normalize(file) === path.normalize(path.join(bundleRoot, "index.md"));

  if (isReserved) {
    if (name === "index.md" && frontmatter !== null && !isRootIndex) {
      warnings.push(
        `${rel(file)}: domain index.md usually has no frontmatter (OKF §6)`,
      );
    }
    for (const href of collectLinks(body)) {
      const resolved = resolveLink(file, href);
      if (resolved && !existsSync(resolved)) {
        warnings.push(`${rel(file)}: broken link → ${href}`);
      }
    }
    continue;
  }

  const inPackage = packageSourceFiles.has(path.normalize(file));
  if (!inPackage) {
    // Markdown outside a convert.yaml package
    warnings.push(
      `${rel(file)}: markdown outside a document package (missing nearby convert.yaml)`,
    );
    continue;
  }

  if (frontmatter === null) {
    errors.push(`${rel(file)}: missing YAML frontmatter`);
    continue;
  }
  if (!fields.type) {
    errors.push(`${rel(file)}: frontmatter missing required non-empty type`);
  }
  if (!fields.title) {
    warnings.push(`${rel(file)}: missing recommended title`);
  }
  if (!fields.description) {
    warnings.push(`${rel(file)}: missing recommended description`);
  }

  for (const href of collectLinks(body)) {
    const resolved = resolveLink(file, href);
    if (resolved && !existsSync(resolved)) {
      warnings.push(`${rel(file)}: broken link → ${href}`);
    }
  }
}

console.log(
  `OKF check: scanned ${mdFiles.length} markdown file(s) under knowledge/ (${packageDirs.size} document package(s))`,
);

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length > 0) {
  console.error(`\nErrors (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("\nOK: no hard conformance errors.");
