# Doc Repo Template

> **Why this exists:** I've spun up nearly identical document repos almost a dozen times. This is the canonical template I clone from when starting a new OKF bundle so I stop rebuilding the same scaffolding from scratch.

Template repository for **OKF document bundles**: Markdown source-of-truth concepts plus Pandoc-based export via `[@dukk/doc-repo-convert](https://github.com/dukk/doc-repo-tools)`.

Fork or clone this repo when you need a new document-generation project (company knowledge, product docs, client packs, etc.).

Sources live under `[knowledge/](knowledge/)` in [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

License: [Apache-2.0](LICENSE).

## Quick start

GitHub Packages requires a token even for public packages. Create a PAT with `read:packages` (or use `gh auth token`) and:

```bash
# PowerShell
$env:NODE_AUTH_TOKEN = (gh auth token)
# bash
export NODE_AUTH_TOKEN="$(gh auth token)"

pnpm init-repo
```

This installs dependencies (including `@dukk/doc-repo-convert`), links the AI harness, checks for Pandoc, resets `knowledge/log.md` and all `index.md` files from existing concepts, then runs `pnpm okf:check`. Concept package files are never removed.

Manual equivalent:

```bash
pnpm install
pnpm link-harness   # wires Claude/Gemini skill & agent bridges
```

**Pandoc** is required for document export. Install from [pandoc.org](https://pandoc.org/installing.html) and ensure `pandoc` is on your `PATH`. Mermaid CLI (`mmdc`) is needed when a package sets `assets.diagrams.mermaid: true`.

The `[.npmrc](.npmrc)` routes `@dukk` to GitHub Packages and reads `NODE_AUTH_TOKEN`.

## Customize for a new project

1. Update `package.json` `name` / `description`.
2. Copy a package from `templates/<type>/` into `knowledge/<category>/<slug>/`, then edit the title-named `.md` source and `convert.yaml`.
3. Run `pnpm init-repo` to rebuild indexes/log and re-verify tooling (or edit indexes by hand).
4. Run `pnpm okf:check` to validate structure.

## Document packages

Every concept (and every template) is a directory with `convert.yaml` plus one or more Markdown sources:

```
my-doc/
  convert.yaml       # formats, out, source groups, assets, link policy
  operating-model.md
  # — or multiple sources —
  intro.md
  body.md
```

`convert.yaml` can group sources into named outputs (N files → 1 document), generate Mermaid/image assets before Pandoc, and rewrite `.md` links to sibling `.docx`/`.pdf`/… outputs. See the [convert package README](https://github.com/dukk/doc-repo-tools#readme).

Reserved navigation files (not packages): `knowledge/index.md`, `knowledge/log.md`, and category `index.md` files.

Sample concepts by document style:


| Style           | Path                                                           | Sample                                                              |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Text-heavy      | `[knowledge/text-heavy/](knowledge/text-heavy/)`               | [Operating model](knowledge/text-heavy/operating-model/)            |
| Text + diagrams | `[knowledge/text-and-diagrams/](knowledge/text-and-diagrams/)` | [Delivery workflow](knowledge/text-and-diagrams/delivery-workflow/) |
| Mostly diagrams | `[knowledge/diagrams/](knowledge/diagrams/)`                   | [System map](knowledge/diagrams/system-map/)                        |


Starter packages: `[templates/](templates/)` (`company`, `brand`, `person`, `service`, `playbook`, `template`, `policy`, `product`, `finance`, `reference`).

## Convert Markdown to other formats

```bash
pnpm convert knowledge/text-heavy/operating-model
pnpm convert --format pdf knowledge/text-and-diagrams/
pnpm convert knowledge/diagrams/system-map --out .output
```

Formats and output default from each package's `convert.yaml` (usually `.output` next to the package). Supported formats: `pdf`, `docx`, `html`, `pptx`. Convert CLI: [`@dukk/doc-repo-convert`](https://github.com/dukk/doc-repo-tools).

## Deconstruct existing documents

Import legacy DOCX, PDF, and other Pandoc-readable sources into OKF packages. Originals stay in `.original/` for reference.

```bash
pnpm deconstruct imports/handbook.docx --out knowledge/text-heavy/handbook
pnpm deconstruct imports/ --out knowledge/imported
```

See [`deconstruct.extractors.yaml`](deconstruct.extractors.yaml) for custom extractor plugins. Deconstruct CLI: [`@dukk/doc-repo-deconstruct`](https://github.com/dukk/doc-repo-tools).

## OKF conformance check

```bash
pnpm okf:check
```

## AI harness (Cursor / Claude / Gemini)


| File / path                          | Role                         |
| ------------------------------------ | ---------------------------- |
| `[AGENTS.md](AGENTS.md)`             | Canonical agent instructions |
| `[CLAUDE.md](CLAUDE.md)`             | Claude Code wrapper          |
| `[GEMINI.md](GEMINI.md)`             | Gemini CLI wrapper           |
| `[.agents/skills/](.agents/skills/)` | Shared skills                |
| `[.agents/agents/](.agents/agents/)` | Shared subagent personas     |
| `[.cursor/rules/](.cursor/rules/)`   | Cursor-scoped rules          |


After clone, run `pnpm link-harness` (also runs on `pnpm install` via `prepare`) so `.claude/` and `.gemini/` point at the shared `.agents/` trees.