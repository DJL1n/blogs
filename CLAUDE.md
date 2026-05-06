# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes, derived from Andrej Karpathy's observations. Merged with project-specific instructions for this Astro blog.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks (typos, one-liners), use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Overview

This repository hosts a personal knowledge blog built with Astro — for long-term personal knowledge management, not a product app.

It stores:
- Long-form technical articles (`blog`)
- Short notes and tips (`notes`)
- Important records: decisions, logs, environment/config notes (`important`)

## Principles

- Prefer a simple static-site architecture.
- No backend/database by default.
- Do not add authentication unless explicitly requested.
- Keep maintenance cost low and content easy to migrate.
- Prioritize readability, consistency, and long-term structure over feature richness.

## Stack

- Astro (static site)
- Markdown/MDX with frontmatter
- Tailwind CSS
- Git + GitHub for versioning
- Cloudflare Pages for deployment

## Content Model

Three Astro Content Collections:

| Collection | Purpose |
|-----------|---------|
| `blog` | Long-form articles, postmortems |
| `notes` | Short technical notes, snippets, quick fixes |
| `important` | Decision logs, config/deployment notes (non-sensitive only) |

Each content item supports:
- `title` (string)
- `date` (date)
- `updated` (date)
- `summary` (string)
- `tags` (string[])
- `category` (string)
- `type` (`blog` | `notes` | `important`)
- `importance` (1-5)
- `draft` (boolean)

Frontmatter template:
```yaml
---
title: ""
date: 2026-05-03
updated: 2026-05-03
summary: ""
tags: []
category: ""
type: "note"
importance: 2
draft: false
---
```

## Routes

- `/` — Home
- `/blog` — Long-form articles list
- `/blog/[slug]` — Article detail
- `/notes` — Short notes list
- `/notes/[slug]` — Note detail
- `/important` — Important records list
- `/important/[slug]` — Record detail
- `/tags` — All tags
- `/tags/[tag]` — Filter by tag
- `/categories` — All categories
- `/categories/[category]` — Filter by category
- `/editor` — Writing assistant (generates Markdown frontmatter)
- `/about` — About page
- `/rss.xml` — RSS feed
- `/search` — Search page

## src Layout

- `src/content/blog/` — Blog markdown
- `src/content/notes/` — Notes markdown
- `src/content/important/` — Important records markdown
- `src/content/config.ts` — Collection schemas
- `src/layouts/` — BaseLayout, PostLayout
- `src/pages/` — Route pages and API endpoints
- `src/components/` — Reusable Astro components
- `src/styles/` — Global CSS
- `public/` — Static assets

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run new:post     # Create a new content file interactively
```

## Task Guidance

1. Implement MVP first, then iterative enhancements.
2. Keep content files plain Markdown/MDX for easy migration.
3. Before moving to the next feature, ensure existing routes and collections remain stable.
4. Run `npm run build` at the end of implementation to verify nothing is broken.
5. Keep types consistent across content collections.

## Git Workflow

- Keep changes committed frequently; each logical change should be one commit.
- After each meaningful modification, run `git add` + `git commit -m "<type>: <summary>"`.
- Push only when requested.
- For local work that isn't finalized, prefer a temporary WIP commit and squash/pick later.

## Non-goals

- No login / authentication
- No dashboard / backend
- No comment system
- No database
