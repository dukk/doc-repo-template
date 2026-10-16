#!/usr/bin/env node
/**
 * Soft/hard conformance check for knowledge/ (OKF atoms) and publications/.
 * Hard errors → exit 1. Warnings are printed but non-fatal.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  CONVERT_CONFIG_FILE,
  LEGACY_DOCUMENT_FILE,
  resolvePrimarySourcePath,
} from "./primary-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeRoot = path.join(root, "knowledge");
const publicationsRoot = path.join(root, "publications");
const RESERVED = new Set(["index.md", "log.md"]);

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

function stripLeadingSlash(href) {
  return href.replace(/^\//, "");
}

function walkMd(dir) {
  /** @type {string[]} */
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === ".output" ||
        entry.name === ".original" ||
        entry.name === "node_modules"
      ) {
        continue;
      }
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
    if (
      entry.name === ".output" ||
      entry.name === ".original" ||
      entry.name === "node_modules"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    dirs.push(full);
    dirs.push(...walkDirs(full));
  }
  return dirs;
}

/**
 * @param {string} target
 * @param {string} base
 */
function isPathUnder(target, base) {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
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
  /** @type {string[]} */
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

/**
 * Resolve a link from knowledge or publications.
 * `/publications/...` → repo root; other `/...` → knowledge/.
 * @param {string} fromFile
 * @param {string} href
 */
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
    const stripped = stripLeadingSlash(href);
    if (stripped.startsWith("publications/")) {
      target = path.join(root, stripped);
    } else {
      target = path.join(knowledgeRoot, stripped);
    }
  } else {
    target = path.resolve(path.dirname(fromFile), href);
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    const index = path.join(target, "index.md");
    if (existsSync(index)) return index;
    const primary = resolvePrimarySourcePath(target);
    if (primary) return primary;
    const legacy = path.join(target, LEGACY_DOCUMENT_FILE);
    if (existsSync(legacy)) return legacy;
    const cfg = path.join(target, CONVERT_CONFIG_FILE);
    if (existsSync(cfg)) return cfg;
    const slugMd = path.join(target, `${path.basename(target)}.md`);
    if (existsSync(slugMd)) return slugMd;
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

  const sources =
    data.sources && typeof data.sources === "object" ? data.sources : {};
  warnEnum(
    sources.unlisted,
    ["individual", "ignore", "error"],
    "sources.unlisted",
    pkgRel,
  );

  const assets =
    data.assets && typeof data.assets === "object" ? data.assets : {};
  warnEnum(assets.mode, ["generate", "reference"], "assets.mode", pkgRel);

  const links = data.links && typeof data.links === "object" ? data.links : {};
  warnEnum(
    links.markdown,
    ["output", "preserve", "remove"],
    "links.markdown",
    pkgRel,
  );
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
        errors.push(
          `${pkgRel}: documents[${index}].name "${name}" is not a safe basename`,
        );
      }
      if (names.has(name)) {
        errors.push(`${pkgRel}: duplicate document name "${name}"`);
      }
      names.add(name);

      const list = Array.isArray(item.sources) ? item.sources.map(String) : [];
      if (list.length === 0) {
        errors.push(
          `${pkgRel}: documents[${index}] (${name}) has empty sources`,
        );
      }
      for (const src of list) {
        const normalized = toPosix(src).replace(/^\.\//, "");
        if (claimed.has(normalized)) {
          errors.push(
            `${pkgRel}: source "${normalized}" listed in multiple documents`,
          );
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

/**
 * @param {string} href
 */
function resolveKnowledgeRef(href) {
  const stripped = stripLeadingSlash(href);
  if (stripped.startsWith("publications/")) {
    return path.join(root, stripped);
  }
  return path.join(knowledgeRoot, stripped);
}

function checkKnowledge() {
  if (!existsSync(knowledgeRoot)) {
    errors.push("knowledge/ bundle not found");
    return { mdCount: 0, conceptCount: 0 };
  }

  const domains = readdirSync(knowledgeRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const domain of domains) {
    const indexPath = path.join(knowledgeRoot, domain, "index.md");
    if (!existsSync(indexPath)) {
      warnings.push(`missing domain index: knowledge/${domain}/index.md`);
    }
  }

  for (const dir of walkDirs(knowledgeRoot)) {
    const cfgPath = path.join(dir, CONVERT_CONFIG_FILE);
    if (existsSync(cfgPath)) {
      errors.push(
        `${rel(cfgPath)}: convert.yaml is not allowed under knowledge/ (use publications/)`,
      );
    }
  }
  const rootCfg = path.join(knowledgeRoot, CONVERT_CONFIG_FILE);
  if (existsSync(rootCfg)) {
    errors.push(
      `${rel(rootCfg)}: convert.yaml is not allowed under knowledge/ (use publications/)`,
    );
  }

  const mdFiles = walkMd(knowledgeRoot);
  let conceptCount = 0;

  for (const file of mdFiles) {
    const name = path.basename(file);
    const raw = readFileSync(file, "utf8");
    const { frontmatter, body, fields } = parseDoc(raw);
    const isReserved = RESERVED.has(name);
    const isRootIndex =
      path.normalize(file) ===
      path.normalize(path.join(knowledgeRoot, "index.md"));

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

    conceptCount += 1;

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

  return { mdCount: mdFiles.length, conceptCount };
}

function checkPublications() {
  if (!existsSync(publicationsRoot)) {
    return { packageCount: 0, mdCount: 0 };
  }

  /** @type {string[]} */
  const packageDirs = [];
  if (existsSync(path.join(publicationsRoot, CONVERT_CONFIG_FILE))) {
    packageDirs.push(publicationsRoot);
  }
  for (const dir of walkDirs(publicationsRoot)) {
    if (existsSync(path.join(dir, CONVERT_CONFIG_FILE))) {
      packageDirs.push(dir);
    }
  }

  let mdCount = 0;

  for (const pkgDir of packageDirs) {
    validateConvertConfig(pkgDir);

    for (const file of walkMd(pkgDir)) {
      let nearest = pkgDir;
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
      if (path.normalize(nearest) !== path.normalize(pkgDir)) continue;

      const name = path.basename(file);
      if (
        RESERVED.has(name.toLowerCase()) ||
        name.toLowerCase() === "readme.md"
      ) {
        continue;
      }

      mdCount += 1;
      const raw = readFileSync(file, "utf8");
      const { frontmatter, body } = parseDoc(raw);
      const stem = name.replace(/\.md$/i, "");
      const metaPath = path.join(pkgDir, `${stem}.meta-data.yml`);

      if (frontmatter !== null) {
        errors.push(
          `${rel(file)}: publication Markdown must not contain frontmatter (use ${stem}.meta-data.yml)`,
        );
      }

      if (!existsSync(metaPath)) {
        errors.push(`${rel(file)}: missing sidecar ${stem}.meta-data.yml`);
      } else {
        let meta;
        try {
          meta = parseYaml(readFileSync(metaPath, "utf8")) ?? {};
        } catch (err) {
          errors.push(
            `${rel(metaPath)}: invalid YAML (${err instanceof Error ? err.message : String(err)})`,
          );
          meta = null;
        }
        if (meta && typeof meta === "object" && !Array.isArray(meta)) {
          if (!meta.title) {
            warnings.push(`${rel(metaPath)}: missing recommended title`);
          }
          if (!meta.description) {
            warnings.push(`${rel(metaPath)}: missing recommended description`);
          }
          if (Array.isArray(meta.knowledge)) {
            for (const ref of meta.knowledge) {
              const href = String(ref);
              const resolved = resolveKnowledgeRef(href);
              if (!existsSync(resolved)) {
                warnings.push(
                  `${rel(metaPath)}: knowledge ref missing → ${href}`,
                );
              }
            }
          }
        }
      }

      for (const href of collectLinks(body)) {
        if (
          href.startsWith("http://") ||
          href.startsWith("https://") ||
          href.startsWith("mailto:") ||
          href.startsWith("#") ||
          href.startsWith("data:")
        ) {
          continue;
        }

        // Absolute paths that are not /publications/ are treated as knowledge refs
        if (href.startsWith("/") && !href.startsWith("/publications/")) {
          errors.push(
            `${rel(file)}: publication body must not link into knowledge/ (${href}); use ${stem}.meta-data.yml knowledge: instead`,
          );
          continue;
        }

        const resolved = resolveLink(file, href);
        if (resolved && isPathUnder(resolved, knowledgeRoot)) {
          errors.push(
            `${rel(file)}: publication body must not link into knowledge/ (${href}); use ${stem}.meta-data.yml knowledge: instead`,
          );
          continue;
        }
        if (resolved && !existsSync(resolved)) {
          warnings.push(`${rel(file)}: broken link → ${href}`);
        }
      }
    }
  }

  return { packageCount: packageDirs.length, mdCount };
}

try {
  parseYaml("a: 1");
} catch {
  console.error("Error: yaml package unavailable for okf-check");
  process.exit(1);
}

const knowledgeStats = checkKnowledge();
const publicationStats = checkPublications();

console.log(
  `OKF check: knowledge/ ${knowledgeStats.mdCount} markdown (${knowledgeStats.conceptCount} concept(s)); publications/ ${publicationStats.mdCount} markdown (${publicationStats.packageCount} package(s))`,
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
