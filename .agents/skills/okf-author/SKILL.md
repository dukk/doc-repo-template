---
name: okf-author
description: >-
  Create or update OKF v0.1 knowledge concepts and publication packages with
  correct frontmatter or sidecar metadata, indexes, cross-links, and log
  entries. Use when adding business docs, playbooks, policies, or fixing OKF
  structure.
---

# OKF author

## When to use

- New concept under `knowledge/`
- New or updated package under `publications/`
- Updating frontmatter, sidecar metadata, body structure, convert config, or cross-links
- Refreshing `knowledge/index.md` or `knowledge/log.md`

## Rules — knowledge

1. One concept = one Markdown file under `knowledge/<category>/<slug>.md`.
2. Concept Markdown (not `index.md` / `log.md`) must have YAML frontmatter with non-empty `type`.
3. Recommended fields: `title`, `description`, `tags`, `timestamp` (ISO 8601). Extensions: `status`, `audience`, `resource`.
4. **No `convert.yaml` under `knowledge/`.** Knowledge is not exported.
5. Prefer links like `[Title](/category/slug.md)` from the knowledge root; link publications as `[Title](/publications/company/slug/slug.md)` or `/publications/clients/<client>/slug/slug.md`.
6. Update category + root `index.md`; add a newest-first note in `knowledge/log.md` for meaningful changes (or run `pnpm init-repo`).
7. Run `pnpm okf:check` before finishing.

## Rules — publications

1. Nest packages by category: `publications/company/<slug>/` for internal company docs; `publications/clients/<client>/<slug>/` for client-specific docs. Each package is `<slug>.md` + `<slug>.meta-data.yml` + `convert.yaml`.
2. Markdown has **no frontmatter**. Identity and `knowledge:` refs live in the sidecar YAML.
3. Publication body must **not** link into `knowledge/`; list related concepts under `knowledge:` in the sidecar.
4. Knowledge concepts may link to the publication or a heading.
5. Configure `convert.yaml` for formats/out/assets/links; export with `pnpm convert publications/company/<slug>` (or the client path).

## Type vocabulary

`Company`, `Brand`, `Person`, `Service`, `Playbook`, `Template`, `Policy`, `Product`, `Finance`, `Reference`.

## Do not

- Put publishable multi-concept docs under `knowledge/`
- Put `convert.yaml` under `knowledge/`
- Use `index.md` or `log.md` as concept filenames
- Invent facts that conflict with existing concepts — surface conflicts instead
