---
name: knowledge-audit
description: >-
  Audit the knowledge/ OKF bundle for conformance: document packages,
  required frontmatter type, reserved filenames, missing indexes, and
  soft-warn broken links. Use when reviewing docs quality or after bulk edits.
---

# Knowledge audit

## Automated check

```bash
pnpm okf:check
```

This fails (exit 1) on hard conformance errors:

- Package Markdown sources missing parseable frontmatter or empty `type`
- Invalid `documents[]` groupings / missing configured sources in `convert.yaml`

It warns (non-fatal) on:

- Missing category `index.md`
- Markdown outside a `convert.yaml` package
- Invalid `sources` / `assets` / `links` enum values
- Bundle-relative links whose targets are missing
- Concepts missing recommended `title` or `description`

## Manual review

1. Skim `knowledge/index.md` for progressive disclosure quality.
2. Confirm related sample/concepts still agree with each other.
3. If AI-generated text conflicts with an existing concept, surface it — do not silently rewrite both.

## After fixes

Re-run `pnpm okf:check` and update `knowledge/log.md` when the audit drove structural changes.
