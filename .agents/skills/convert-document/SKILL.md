---
name: convert-document
description: >-
  Export publication packages to PDF, DOCX, HTML, or PPTX using the
  repo convert wrapper and doc-repo convert CLI (Pandoc). Use when the user
  asks to publish, export, or convert documents.
---

# Convert document

## Prerequisites

- `pnpm install` from repo root (pulls `@dukk/doc-repo-convert`; needs `NODE_AUTH_TOKEN` for GitHub Packages)
- `pandoc` on PATH (required)
- `mmdc` on PATH when `assets.diagrams.mermaid: true` (from `@mermaid-js/mermaid-cli`)

## Commands

```bash
# Use formats/out/documents/assets/links from convert.yaml
pnpm convert publications/company/operating-model

# Override formats
pnpm convert --format pdf,docx publications/<package-or-tree>

# Override output directory (cwd-relative)
pnpm convert publications/<package> --out .output
```

Supported formats: `pdf`, `docx`, `html`, `pptx`.

## Behavior notes

- `pnpm convert` runs `scripts/convert.mjs`, which merges each `<stem>.meta-data.yml` into temp Markdown (stripping `knowledge:`) then calls `doc-convert`.
- Input must be a publication package (`convert.yaml` + Markdown + sidecar) or a tree under `publications/`.
- **`knowledge/` is refused** — concepts are not exported.
- `documents[]` groups ordered sources into named outputs; `sources.unlisted` controls leftovers (`individual` | `ignore` | `error`).
- `assets.mode: generate` copies local images and can render Mermaid to SVG **before** Pandoc.
- `links.markdown: output` rewrites `.md` links to sibling output artifacts (or same-document anchors).
- `options.cover_page: true` prepends a title/subtitle/author/date block and a page break before the body.
- `options.reference_doc` (package-relative path, usually `.original/*.docx`) is passed to Pandoc as `--reference-doc` for **docx** and **pptx**.
- Default output is `.output/` beside the package (gitignored).
- Convert tooling lives in [doc-repo-tools](https://github.com/dukk/doc-repo-tools) (`@dukk/doc-repo-convert`), wrapped by this repo's `scripts/convert.mjs`.

## Checklist

1. Confirm the path is under `publications/` (not `knowledge/`).
2. Ensure each Markdown source has a matching `<stem>.meta-data.yml` and no frontmatter.
3. Ensure Pandoc (and Mermaid CLI if needed) are available.
4. Ensure `@dukk/doc-repo-convert` is installed (`pnpm install`).
5. Run convert and report logical documents, outputs, and assets.
6. Do not commit generated files under `.output/`.
