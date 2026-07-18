---
type: Reference
title: System map
description: Diagram-first sample of tools, flows, and ownership boundaries.
tags: [sample, architecture, diagrams]
timestamp: 2026-07-18T00:00:00Z
status: draft
audience: internal
---

# Purpose

Diagram-first sample. Captions are short; the maps carry the meaning. Pair with [Operating model](/text-heavy/operating-model/document.md) and [Delivery workflow](/text-and-diagrams/delivery-workflow/) when you need narrative detail.

# Bundle layout

```mermaid
flowchart TB
  subgraph repo[doc-repo]
    K[knowledge/]
    T[templates/]
    C["@dukk/doc-repo-convert"]
    A[.agents/]
  end

  K --> IDX[index.md]
  K --> LOG[log.md]
  K --> TH[text-heavy/]
  K --> TD[text-and-diagrams/]
  K --> DG[diagrams/]
  TH --> OM[operating-model/]
  TD --> DW[delivery-workflow/]
  DG --> SM[system-map/]
  T -.->|copy starters| K
  C -->|Pandoc export| DIST[.output/]
  A -->|skills / agents| K
```

# Author → publish flow

```mermaid
flowchart LR
  A[Author Markdown] --> B[pnpm okf:check]
  B --> C{Hard errors?}
  C -->|Yes| A
  C -->|No| D[Optional: pnpm convert]
  D --> E[Review artifact in .output/]
  E --> F[Share externally if needed]
```

# Ownership boundaries

```mermaid
flowchart TB
  subgraph humans[Humans]
    O[Outcome owner]
    DL[Delivery lead]
    R[Reviewer]
  end

  subgraph agents[Agents]
    KL[knowledge-librarian]
    DP[doc-publisher]
    PR[policy-reviewer]
  end

  subgraph artifacts[Artifacts]
    MD[OKF Markdown]
    EXP[Exported PDF/DOCX/HTML/PPTX]
  end

  O --> MD
  DL --> MD
  R --> MD
  KL --> MD
  PR --> MD
  DP --> EXP
  MD --> EXP
```

# Tooling graph

```mermaid
flowchart TD
  PNPM[pnpm scripts] --> BUILD[build convert CLI]
  PNPM --> CHECK[okf:check]
  PNPM --> CONV[convert]
  PNPM --> LINK[link-harness]
  BUILD --> CLI[doc-convert]
  CONV --> CLI
  CLI --> PANDOC[Pandoc]
  LINK --> CLAUDE[.claude skills/agents]
  LINK --> GEMINI[.gemini agents]
```

# Concept relationships

```mermaid
mindmap
  root((knowledge bundle))
    Operating model
      Principles
      Cadence
      Roles
    Delivery workflow
      Intake
      Authoring
      Publish
    System map
      Layout
      Flows
      Ownership
```

# Captions only

| Diagram | Read it as |
|---------|------------|
| Bundle layout | Where source truth and tooling live |
| Author → publish | Minimum path from edit to optional export |
| Ownership | Who may change Markdown vs who prepares exports |
| Tooling | How pnpm scripts connect to Pandoc and harness links |
| Concept relationships | How the three samples reinforce each other |
