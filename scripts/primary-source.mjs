import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const LEGACY_DOCUMENT_FILE = "document.md";
export const CONVERT_CONFIG_FILE = "convert.yaml";
const RESERVED = new Set(["index.md", "log.md"]);

/** @param {string} title */
export function titleToSourceFilename(title) {
  const stem = title
    .trim()
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!stem) {
    throw new Error("Title must produce a non-empty source filename");
  }
  return `${stem}.md`;
}

/** @param {string} pkgDir */
export function listPackageMarkdownSources(pkgDir) {
  if (!existsSync(pkgDir)) return [];
  return readdirSync(pkgDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".md") &&
        !RESERVED.has(entry.name.toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} pkgDir
 * @param {string} [slug]
 * @returns {string | null}
 */
export function resolvePrimarySourceRel(pkgDir, slug = path.basename(pkgDir)) {
  const legacy = path.join(pkgDir, LEGACY_DOCUMENT_FILE);
  if (existsSync(legacy)) return LEGACY_DOCUMENT_FILE;

  if (!existsSync(path.join(pkgDir, CONVERT_CONFIG_FILE))) {
    return null;
  }

  const sources = listPackageMarkdownSources(pkgDir);
  if (sources.length === 0) return null;
  if (sources.length === 1) return sources[0];

  const slugMatch = sources.find((name) => {
    const stem = name.replace(/\.md$/i, "");
    return stem === slug || stem.startsWith(`${slug}-`);
  });
  if (slugMatch) return slugMatch;

  const secondary = /^sow(-|$|\d)/i;
  const primaryCandidates = sources.filter(
    (name) => !secondary.test(name.replace(/\.md$/i, "")),
  );
  const pool = primaryCandidates.length > 0 ? primaryCandidates : sources;
  return pool[0] ?? null;
}

/** @param {string} pkgDir @param {string} [slug] */
export function resolvePrimarySourcePath(pkgDir, slug) {
  const rel = resolvePrimarySourceRel(pkgDir, slug);
  return rel ? path.join(pkgDir, rel) : null;
}
