---
name: deconstruct-document
description: >-
  Import existing documents into publication packages using the
  doc-repo deconstruct CLI. Originals are preserved under .original/.
  Use when onboarding legacy DOCX, PDF, or other source files.
---

# Deconstruct document

## Prerequisites

- `pnpm install` from repo root (pulls `@dukk/doc-repo-deconstruct`; needs `NODE_AUTH_TOKEN` for GitHub Packages)
- `pandoc` on PATH for the built-in extractor (or register a custom extractor)

## Commands

```bash
# Import a single file into a new publication package
pnpm deconstruct imports/handbook.docx --out publications/company/handbook

# Batch import every file in a directory
pnpm deconstruct imports/ --out publications/imported

# Override OKF type/title or force overwrite of generated files
pnpm deconstruct source.docx --out publications/company/foo --type Policy --title "Foo" --force
```

Prefer `publications/` for multi-concept publishable imports. After import, move identity from Markdown frontmatter into `<slug>.meta-data.yml` (no frontmatter on publication Markdown) before relying on `pnpm convert`.

## Package layout after import

```
publications/company/<slug>/
  .original/<source-file>     # byte-identical copy; never edited by tooling
  deconstruct.yaml            # provenance (sha256, extractor, imported_at)
  <title-slug>.md             # Markdown body (strip frontmatter for publications)
  <title-slug>.meta-data.yml  # identity + knowledge: refs
  convert.yaml                # ready for pnpm convert
  assets/…                    # extracted media when present
```

## Custom extractors

Optional repo-root `deconstruct.extractors.yaml` registers plugins. See the [deconstruct package README](https://github.com/dukk/doc-repo-tools#readme).

## Checklist

1. Confirm Pandoc (or custom extractor) is available.
2. Choose an output path under `publications/` (company or clients).
3. Run deconstruct; verify `.original/` and generated Markdown.
4. Convert frontmatter into sidecar `.meta-data.yml`; remove body frontmatter.
5. Run `pnpm okf:check`, then `pnpm convert` when ready to export.
6. Do not edit files under `.original/`.
