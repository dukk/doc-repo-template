#!/usr/bin/env node
/**
 * One-shot migration: rename document.md to title-based filenames and update links.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { titleToSourceFilename } from "./primary-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(root, "knowledge");
const templatesRoot = path.join(root, "templates");

/** @type {Map<string, string>} old absolute path -> new absolute path */
const renames = new Map();

/** @param {string} raw */
function parseTitle(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^title:\s*(.*)$/);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return null;
}

/** @param {string} dir */
function walkDirs(dir) {
  /** @type {string[]} */
  const dirs = [];
  if (!existsSync(dir)) return dirs;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if ([".output", ".original", "node_modules"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    dirs.push(full, ...walkDirs(full));
  }
  return dirs;
}

/** @param {string} dir */
function collectMarkdownFiles(dir) {
  /** @type {string[]} */
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".output", ".original", "node_modules"].includes(entry.name)) continue;
      files.push(...collectMarkdownFiles(full));
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function planRename(filePath) {
  const base = path.basename(filePath);
  const dir = path.dirname(filePath);
  const raw = readFileSync(filePath, "utf8");
  const title = parseTitle(raw);
  if (!title) {
    console.warn(`Skip (no title): ${path.relative(root, filePath)}`);
    return;
  }
  const newName = titleToSourceFilename(title);
  if (newName === base) return;
  const newPath = path.join(dir, newName);
  if (existsSync(newPath) && path.resolve(newPath) !== path.resolve(filePath)) {
    throw new Error(`Target exists: ${newPath}`);
  }
  renames.set(path.resolve(filePath), newPath);
}

function applyRenames() {
  for (const [from, to] of renames) {
    renameSync(from, to);
    console.log(`Renamed ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  }
}

function bundleRel(absPath) {
  const rel = path.relative(bundleRoot, absPath).replaceAll("\\", "/");
  return `/${rel}`;
}

function updateLinks() {
  /** @type {Map<string, string>} */
  const linkMap = new Map();
  for (const [from, to] of renames) {
    linkMap.set(bundleRel(from), bundleRel(to));
    linkMap.set(`${bundleRel(path.dirname(from))}/document.md`, bundleRel(to));
  }

  const scanRoots = [bundleRoot, templatesRoot, root];
  const touched = new Set();
  for (const scanRoot of scanRoots) {
    for (const file of collectMarkdownFiles(scanRoot)) {
      if (file.endsWith("rename-sources.mjs")) continue;
      let body = readFileSync(file, "utf8");
      let changed = false;
      for (const [oldHref, newHref] of linkMap) {
        if (body.includes(oldHref)) {
          body = body.split(oldHref).join(newHref);
          changed = true;
        }
      }
      if (changed) {
        writeFileSync(file, body, "utf8");
        touched.add(path.relative(root, file));
      }
    }
  }

  for (const extra of [
    "AGENTS.md",
    "README.md",
    ".agents/skills/okf-author/SKILL.md",
    ".agents/skills/deconstruct-document/SKILL.md",
    ".agents/skills/knowledge-audit/SKILL.md",
    ".cursor/rules/okf-knowledge.mdc",
  ]) {
    const file = path.join(root, extra);
    if (!existsSync(file)) continue;
    let body = readFileSync(file, "utf8");
    let changed = false;
    for (const [oldHref, newHref] of linkMap) {
      if (body.includes(oldHref)) {
        body = body.split(oldHref).join(newHref);
        changed = true;
      }
    }
    if (body.includes("document.md")) {
      body = body
        .replaceAll("`document.md` + `convert.yaml`", "title-named `.md` sources + `convert.yaml`")
        .replaceAll("<slug>/document.md` + `convert.yaml`", "`<slug>/<title>.md` + `convert.yaml`")
        .replaceAll("<slug>/document.md` + `convert.yaml`", "`<slug>/<title>.md` + `convert.yaml`")
        .replaceAll("`<slug>/document.md`", "`<slug>/<title>.md`")
        .replaceAll("(/category/slug/document.md)", "(/category/slug/<title-slug>.md)")
        .replaceAll("(/company/about/document.md)", "(/company/about/about-infuse-partners.md)")
        .replaceAll("document.md` (not `index.md`", "concept source `.md` (not `index.md`")
        .replaceAll("Edit generated `document.md`", "Edit generated title-named `.md` source")
        .replaceAll("  document.md                 # OKF Markdown + frontmatter", "  <title-slug>.md             # OKF Markdown + frontmatter (kebab-case from title)")
        .replaceAll("(`document.md` + `convert.yaml`)", "(title-named `.md` + `convert.yaml`)")
        .replaceAll("one or more Markdown sources (`document.md`", "one or more Markdown sources (title-named `.md`")
        .replaceAll("[Title](/category/slug/document.md)", "[Title](/category/slug/<title-slug>.md)");
      changed = true;
    }
    if (changed) {
      writeFileSync(file, body, "utf8");
      touched.add(extra);
    }
  }

  console.log(`Updated links in ${touched.size} file(s)`);
}

function main() {
  for (const dir of walkDirs(bundleRoot)) {
    if (!existsSync(path.join(dir, "convert.yaml"))) continue;
    const docPath = path.join(dir, "document.md");
    if (existsSync(docPath)) planRename(docPath);
  }

  for (const dir of walkDirs(templatesRoot)) {
    if (!existsSync(path.join(dir, "convert.yaml"))) continue;
    const docPath = path.join(dir, "document.md");
    if (existsSync(docPath)) planRename(docPath);
  }

  const sowPath = path.join(bundleRoot, "finance", "technology-msp", "sow.md");
  if (existsSync(sowPath)) {
    planRename(sowPath);
  }

  console.log(`Planned ${renames.size} rename(s)`);
  applyRenames();
  updateLinks();
}

main();
