# Impeccable: Frontend Design Agent

**Impeccable** — v3.5.0, Apache 2.0. Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft.

Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. **Not for backend-only or non-UI tasks.**

## When to use this skill

Trigger on any `/impeccable` command or when the user asks for frontend design help: building UI, critiquing design, polishing, auditing accessibility, improving typography, color, layout, animation, or overall visual quality.

## Setup — before any design work

1. **Load context**: Check for PRODUCT.md and DESIGN.md in the project root (also check `.agents/context/` and `docs/` as fallbacks).
2. **Identify the register** (brand or product) and load the matching reference: `reference/brand.md` or `reference/product.md`.
3. **If a sub-command was invoked** (e.g. `craft`, `shape`, `audit`), load its reference file too. This is non-negotiable — `craft` without `craft.md` skips the shape-and-confirm step the user expects.

If PRODUCT.md is missing or is a placeholder (<200 chars, `[TODO]` markers): run `/impeccable teach`, then resume the original task with the fresh context.

If DESIGN.md is missing: nudge once per session (*"Run `/impeccable document` for more on-brand output"*), then proceed.

## Register

Every design task is one of two registers:

- **Brand**: marketing, landing, campaign, long-form content, portfolio — design IS the product
- **Product**: app UI, admin, dashboard, tool — design SERVES the product

**Identify before designing.** Priority order:
1. Cue in the task itself ("landing page" vs "dashboard")
2. The surface in focus (the page, file, or route being worked on)
3. `register` field in PRODUCT.md

First match wins. If PRODUCT.md lacks the `register` field, infer it once from the "Users" and "Product Purpose" sections, cache for the session, and suggest `/impeccable teach` to add it explicitly.

## Shared Design Laws

Apply to every design, both registers. Vary across projects; never converge on the same choices.

### Color

- Use OKLCH. Reduce chroma as lightness approaches 0 or 100 — high chroma at extremes looks garish.
- Never use `#000` or `#fff`. Tint every neutral toward the brand hue (chroma 0.005–0.01 is enough to feel natural without reading as tinted).
- **Pick a color strategy before picking colors.** Four steps on the commitment axis:
  - **Restrained**: tinted neutrals + one accent ≤10%. Product default; brand minimalism.
  - **Committed**: one saturated color carries 30–60% of the surface. Brand default for identity-driven pages.
  - **Full palette**: 3–4 named roles, each used deliberately. Brand campaigns; product data viz.
  - **Drenched**: the surface IS the color. Brand heroes, campaign pages.
- The "one accent ≤10%" rule is Restrained only. Committed / Full palette / Drenched exceed it on purpose. Don't collapse every design to Restrained by reflex.
- Gray text on colored backgrounds is always wrong. Use a darker shade of the background color instead.
- WCAG: ≥4.5:1 for body text, ≥3:1 for UI components. Placeholder text still needs 4.5:1.

### Theme

Dark vs. light is never a default. Not dark "because tools look cool dark." Not light "to be safe."

Before choosing, write one sentence of physical scene: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, it's not concrete enough. Add detail until it does.

"Observability dashboard" does not force an answer. "SRE glancing at incident severity on a 27-inch monitor at 2am in a dim room" does. Run the sentence, not the category.

### Typography

- Cap body line length at 65–75ch.
- Hierarchy through scale + weight contrast (≥1.25 ratio between steps). Avoid flat scales.
- `text-wrap: balance` on headings.
- Minimum 16px body text. Never disable zoom.

### Layout

- Vary spacing for rhythm. Same padding everywhere is monotony. Use a 4pt base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- Flexbox for 1D, grid for 2D.
- Cards are the lazy answer. Use them only when they're truly the best affordance. Nested cards are always wrong.
- Don't wrap everything in a container. Most things don't need one.

### Motion

- Don't animate CSS layout properties.
- Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic.
- 150–250ms for most transitions. Exit animations at ~75% of enter duration.
- Always include `@media (prefers-reduced-motion: reduce)`.

### Copy

- Every word earns its place. No restated headings, no intros that repeat the title.
- Specific verbs ("search", "filter", "deploy") over generic ("manage", "handle", "deal with").
- Error messages name what went wrong and what to do about it.

## Commands

### `/impeccable craft <task>`

Full design flow: understand → explore → shape → build → verify.

1. **Understand** — Load register + reference. State the design problem as a concrete before/after. Confirm with the user before proceeding.
2. **Explore** — Generate 2–3 visual directions (each with color strategy, typography pairing, layout skeleton). Present as mood boards or code sketches.
3. **Shape** — User picks a direction. Produce a high-fidelity static version of the core surface. HTML+CSS, real code.
4. **Build** — Implement the full interface with all states.
5. **Verify** — Check: responsive breakpoints, WCAG color contrast, keyboard navigation, reduced motion, touch targets, loading/error/empty states.

### `/impeccable audit [url|path]`

Visual + UX audit of a page.

1. Screenshot or load the page.
2. Evaluate against: color harmony, typography scale, spacing rhythm, alignment consistency, accessibility (contrast + focus + headings), motion quality, responsive behavior.
3. Return a scored checklist with specific code-level fixes.

### `/impeccable polish <path>`

Focused improvement pass on existing code. Like craft but starts with what's there and iterates it forward. No re-build, no new structure — refine what exists.

### `/impeccable teach [path]`

Scaffold or update PRODUCT.md with what this project is, who it's for, and what register it lives in. Creates the context file that `craft`, `audit`, and `polish` need to produce on-brand output.

### `/impeccable document [path]`

Scaffold or update DESIGN.md — the design system reference for this project. Color tokens, typography scale, spacing units, component patterns.

### `/impeccable redesign <path>`

Full redesign of a specific page or component. Like craft but explicit that we're replacing an existing surface, not building new.
