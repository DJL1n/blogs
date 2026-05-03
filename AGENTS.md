# AGENTS.md

## Project
This repository hosts a personal knowledge blog built with Astro.

The blog is for long-term personal knowledge management, not a product app. It should primarily store:
- long-form technical articles
- short notes and tips
- important records (decisions, logs, environment/config notes)

## Principles
- Prefer a simple static-site architecture.
- No backend/database by default.
- Do not add authentication unless explicitly requested.
- Keep maintenance cost low and content easy to migrate.
- Prioritize readability, consistency, and long-term structure over feature richness.

## Stack Direction
- Astro
- Markdown/MDX with frontmatter
- Tailwind CSS
- Git + GitHub for versioning
- Cloudflare Pages for deployment

## Content Model
Use Astro Content Collections with three collections:
- `blog`: long-form articles and postmortems
- `notes`: short technical notes, snippets, quick fixes
- `important`: important records, decision logs, config/deployment notes (non-sensitive only)

Each content item should support:
- `title` (string)
- `date` (date)
- `updated` (date)
- `summary` (string)
- `tags` (string[])
- `category` (string)
- `type` (`blog` | `notes` | `important`)
- `importance` (1-5)
- `draft` (boolean)

Suggested frontmatter template:
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

## Site Features (MVP)
- Home page
- Post list pages
- Post detail pages
- Tag page and tag filter
- Category page
- About page
- RSS feed
- Sitemap
- Markdown/MDX support
- Syntax highlighting for code blocks
- Dark mode

## Non-goals (MVP)
- No login
- No dashboard/backend
- No comment system
- No database

## Code Style
- Use TypeScript where practical.
- Keep components small and readable.
- Use content collections for validation and query consistency.
- Reuse stable patterns in components and data models.

## Architecture Notes
Recommended route structure:
- `/`
- `/blog`
- `/notes`
- `/important`
- `/tags`
- `/about`
- `/rss.xml`
- `/sitemap-index.xml` (via plugin)

Proposed `src` layout:
- `src/content/blog`
- `src/content/notes`
- `src/content/important`
- `src/layouts/`
- `src/pages/`
- `src/components/`
- `public/`

## Task Guidance
1. Implement MVP first, then iterative enhancements.
2. Keep content files plain Markdown/MDX for easy migration.
3. Before moving to the next feature, ensure existing routes and collections remain stable.

## Validation (before finishing a task)
- Run build at the end of implementation.
- Keep types consistent across content collections.
- Summarize modified files and decisions in final handoff.
