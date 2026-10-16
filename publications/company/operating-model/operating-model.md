# Purpose

This document is a **sample publication**: a text-heavy operating model you can export with `pnpm convert`. Use it as a starting point for policies, playbooks, briefs, and other narrative documents where explanation matters more than visuals.

Replace the placeholder organization language below with your own facts. Prefer linking related **knowledge** concepts from the publication sidecar (`knowledge:` in `.meta-data.yml`) instead of Markdown body links into `knowledge/`.

# Context

Most teams drift when planning, delivery, and review live in separate tools with no shared language. An operating model gives everyone a short, durable account of:

- what work is allowed to start
- how progress is made visible
- when a decision needs an owner
- how completed work is closed and learned from

The goal is not bureaucracy. The goal is fewer surprises, clearer handoffs, and documents that agents and humans can trust.

# Guiding principles

1. **Write the decision, not the theater.** If a meeting exists only to rediscover status, capture status in writing first.
2. **One owner per outcome.** Shared responsibility without a named owner is deferred ownership.
3. **Prefer small reversible steps.** Large irreversible changes need written rationale and an explicit review date.
4. **Docs stay true.** When new text conflicts with an existing concept, surface the conflict. Do not silently invent a merge.
5. **Audience is intentional.** Internal drafts and client-facing exports are different documents, even when they share facts.

# Planning cadence

## Quarterly shape

At the start of each quarter, leadership names a small set of outcomes (usually three to five). Each outcome has:

- a plain-language success statement
- a named owner
- the constraints that matter (budget, capacity, compliance, dependencies)
- the first milestone that would prove progress

Outcomes that cannot name an owner or a first milestone remain ideas, not commitments.

## Weekly selection

Each week, teams pull work that advances an active outcome. Work enters the system only when:

1. the outcome is still active
2. the next step is concrete enough to finish within the week (or has a clear multi-week plan)
3. any external dependency is named

Work that fails those checks stays in a backlog note, not in delivery status.

# Delivery expectations

Delivery is judged by completed outcomes, not by activity volume. A healthy week usually includes:

- progress against at least one named milestone
- an explicit list of blocked items with owners of the unblock
- a short note on what changed in understanding (assumptions invalidated, scope narrowed, risk raised)

Status language should be boring and precise. Prefer “blocked on legal review since Tuesday” over “in progress.” Prefer “shipped the draft to the client” over “moved forward.”

# Review and learning

Every meaningful piece of work gets a close-out note when it ends—successful or not. The close-out answers four questions:

1. What did we set out to do?
2. What actually happened?
3. What will we reuse next time?
4. What concept in this bundle should be updated because of what we learned?

If the answer to (4) is “nothing,” confirm that intentionally. Silence is how stale guidance survives.

# Roles (lightweight)

| Role | Owns | Does not own alone |
|------|------|--------------------|
| Outcome owner | Success definition and tradeoffs | Day-to-day task assignment for every contributor |
| Delivery lead | Sequencing, blockers, quality bar | Changing the outcome without the owner |
| Reviewer | Fitness for audience / compliance | Rewriting facts to make a conflict disappear |
| Author | Clarity and currency of the concept | Inventing policy without review |

# Writing standard for this bundle

When you add or revise **knowledge** concepts:

- Keep YAML frontmatter with a non-empty `type`
- Prefer `title`, `description`, `tags`, and `timestamp`
- Use bundle-relative links such as `/company/example-company.md`
- Link publications as `/publications/company/operating-model/operating-model.md`
- Update the folder `index.md` and root `knowledge/index.md` when adding concepts
- Add a newest-first note to `knowledge/log.md` for structural changes

When you add or revise **publications**:

- No Markdown frontmatter — put identity in `<slug>.meta-data.yml`
- List related knowledge under sidecar `knowledge:` (do not paste knowledge paths as Markdown links in this body)
- Do not link from the publication body into `knowledge/`
