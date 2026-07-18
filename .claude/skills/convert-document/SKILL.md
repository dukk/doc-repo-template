---
name: convert-document
description: >-
  Export OKF document packages to PDF, DOCX, HTML, or PPTX using the
  doc-repo convert CLI (Pandoc). Use when the user asks to publish,
  export, or convert documents.
---

# Convert document

## Prerequisites

- `pnpm install` from repo root (pulls `@dukk/doc-repo-convert`; needs `NODE_AUTH_TOKEN` for GitHub Packages)
- `pandoc` on PATH (required)
- `mmdc` on PATH when `assets.diagrams.mermaid: true` (from `@mermaid-js/mermaid-cli`)

## Commands

```bash
# Use formats/out/documents/assets/links from convert.yaml
pnpm convert knowledge/text-and-diagrams/delivery-workflow

# Override formats
pnpm convert --format pdf,docx <package-or-tree>

# Override output directory (cwd-relative)
pnpm convert <package> --out .output
```

Supported formats: `pdf`, `docx`, `html`, `pptx`.

## Behavior notes

- Input must be a document package (`convert.yaml` + Markdown sources) or a tree containing packages.
- `documents[]` groups ordered sources into named outputs; `sources.unlisted` controls leftovers (`individual` | `ignore` | `error`).
- `assets.mode: generate` copies local images and can render Mermaid to SVG **before** Pandoc.
- `links.markdown: output` rewrites `.md` links to sibling output artifacts (or same-document anchors).
- Reserved `index.md` / `log.md` are not packages and are skipped when walking.
- Default output is `.output/` beside the package (gitignored).
- Convert tooling lives in [doc-repo-tools](https://github.com/dukk/doc-repo-tools) (`@dukk/doc-repo-convert`), not in this template.

## Checklist

1. Confirm the path is a package under `knowledge/` (or an intentional template).
2. Ensure Pandoc (and Mermaid CLI if needed) are available.
3. Ensure `@dukk/doc-repo-convert` is installed (`pnpm install`).
4. Run convert and report logical documents, outputs, and assets.
5. Do not commit generated files under `.output/`.
