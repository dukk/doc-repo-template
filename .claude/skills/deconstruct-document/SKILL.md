---
name: deconstruct-document
description: >-
  Import existing documents into OKF Markdown packages using the
  doc-repo deconstruct CLI. Originals are preserved under .original/.
  Use when onboarding legacy DOCX, PDF, or other source files.
---

# Deconstruct document

## Prerequisites

- `pnpm install` from repo root (pulls `@dukk/doc-repo-deconstruct`; needs `NODE_AUTH_TOKEN` for GitHub Packages)
- `pandoc` on PATH for the built-in extractor (or register a custom extractor)

## Commands

```bash
# Import a single file into a new OKF package
pnpm deconstruct imports/handbook.docx --out knowledge/text-heavy/handbook

# Batch import every file in a directory
pnpm deconstruct imports/ --out knowledge/imported

# Override OKF type/title or force overwrite of generated files
pnpm deconstruct source.docx --out knowledge/foo --type Policy --title "Foo" --force
```

## Package layout after import

```
knowledge/<category>/<slug>/
  .original/<source-file>     # byte-identical copy; never edited by tooling
  deconstruct.yaml            # provenance (sha256, extractor, imported_at)
  <title-slug>.md             # OKF Markdown + frontmatter (kebab-case from title)
  convert.yaml                # ready for pnpm convert
  assets/…                    # extracted media when present
```

## Custom extractors

Register external tools in repo-root `deconstruct.extractors.yaml` (see [doc-repo-tools](https://github.com/dukk/doc-repo-tools)). Custom matchers run before the Pandoc fallback.

## Checklist

1. Place source files outside `knowledge/` or import directly into the target package path.
2. Run deconstruct; verify `.original/` matches the source bytes.
3. Edit generated title-named `.md` source frontmatter/body as needed.
4. Update category + root indexes and `knowledge/log.md`.
5. Run `pnpm okf:check`, then `pnpm convert` to verify round-trip export.

## Boundaries

- Deconstruct output is a starting point — refine structure and links manually or with `okf-author`.
- Do not commit `.output/` exports.
- Tooling lives in [doc-repo-tools](https://github.com/dukk/doc-repo-tools) (`@dukk/doc-repo-deconstruct`).
