---
name: okf-author
description: >-
  Create or update OKF v0.1 document packages in knowledge/ with correct
  frontmatter, convert.yaml, indexes, cross-links, and log entries. Use when
  adding business docs, playbooks, policies, templates, or fixing OKF structure.
---

# OKF author

## When to use

- New concept package under `knowledge/`
- Updating frontmatter, body structure, convert config, or cross-links
- Refreshing `knowledge/index.md` or `knowledge/log.md`

## Rules

1. Every concept is a directory with `convert.yaml` plus one or more Markdown sources (title-named `.md` files from frontmatter `title`, and/or grouped files).
2. Concept Markdown (not `index.md` / `log.md`) must have YAML frontmatter with non-empty `type`.
3. Recommended fields: `title`, `description`, `tags`, `timestamp` (ISO 8601). Extensions: `status`, `audience`, `resource`.
4. Start by copying `templates/<type>/` into `knowledge/<category>/<slug>/`.
5. Use kebab-case package directory names; concept ID is the path under `knowledge/` to the package.
6. Prefer links like `[Title](/category/slug/<title-slug>.md)` from the bundle root (kebab-case from `title`).
7. Configure `convert.yaml` `documents[]` when multiple sources should combine into one export.
8. Update category + root `index.md`; add a newest-first note in `knowledge/log.md` for meaningful changes.
9. Run `pnpm okf:check` before finishing.

## Type vocabulary

`Company`, `Brand`, `Person`, `Service`, `Playbook`, `Template`, `Policy`, `Product`, `Finance`, `Reference`.

## Do not

- Put business concepts outside `knowledge/`
- Use `index.md` or `log.md` as concept package names
- Invent facts that conflict with existing concepts — surface conflicts instead
