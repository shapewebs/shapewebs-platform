# Shapewebs visual foundation

## Purpose

Shapewebs should feel precise, capable, and quietly distinctive. The system
takes inspiration from the restraint, hierarchy, speed, and product discipline
visible in Linear, while preserving an original Shapewebs identity, component
language, color system, and page composition.

The goal is not a collection of attractive pages. It is one coherent system
that can support:

- an expressive public studio website;
- a focused employee workspace;
- structured Sanity content without layout drift;
- future customer surfaces without sharing administrative identity or code;
- fast static rendering and deliberately small browser bundles; and
- accessible interaction under keyboard, touch, zoom, reduced motion, forced
  colors, and high-contrast conditions.

## Brand idea: structured momentum

Shapewebs combines two qualities:

1. **Structure** — alignment, rhythm, legibility, technical confidence, and
   interfaces that explain themselves.
2. **Momentum** — purposeful asymmetry, progressive disclosure, decisive
   actions, and visual sequences that move a visitor toward understanding.

The signature is the relationship between points, lines, fields, and changing
shapes. It may appear as restrained framing, cropped geometry, or a single
directional transition. It must not become a decorative grid placed behind
every section.

## What the references teach us

| Reference quality           | Shapewebs translation                                     |
| --------------------------- | --------------------------------------------------------- |
| Calm hierarchy              | Fewer simultaneous focal points and deliberate type scale |
| Product precision           | Shared primitives, exact states, consistent density       |
| Dark public presentation    | A controlled near-black showcase theme                    |
| Light application workspace | A neutral, high-legibility studio theme                   |
| Sparse accent color         | Blue is functional; mint is a rare live-state signal      |
| Fine boundaries             | One-pixel separation before shadows or glass effects      |
| Large negative space        | Content is grouped by meaning, not filled to capacity     |

Shapewebs will not copy Linear's logo, purple identity, navigation, page
layouts, product mockups, iconography, wording, or animation signatures.

## Two contexts, one system

### Showcase

The public website uses the explicit `showcase` theme:

- near-black canvas;
- cool neutral surfaces;
- white primary text and restrained gray supporting text;
- Shapewebs blue for links, focus, and primary emphasis;
- mint only for verified availability or live-state signals;
- editorial spacing and larger type;
- static-first Server Components;
- motion only when it explains sequence, state, or spatial relationship.

The public theme does not change automatically with the operating-system color
preference. The art direction is intentional, so metadata, browser chrome, and
the rendered page remain consistent.

### Studio

The employee application uses the explicit `studio` theme:

- quiet off-white application canvas;
- white work surfaces;
- near-black primary text;
- subtle neutral borders;
- Shapewebs blue for primary actions, focus, and selected state;
- compact but comfortable information density;
- minimal shadows, reserved for floating layers;
- clear state labels and predictable controls.

Authentication pages use the same studio tokens with a calmer, single-task
composition. They are not a separate brand.

## Token architecture

Global CSS owns only foundations:

- type families and weights;
- space and size scales;
- radii;
- content widths;
- timing and easing;
- z-index layers;
- semantic color roles;
- semantic elevation;
- compatibility aliases during migration.

Component CSS Modules own component presentation. Page CSS Modules own only
composition unique to that page. Pages may not introduce a parallel palette,
button system, type scale, or shadow language.

Tokens use the `--ui-*` namespace. New code must use semantic roles rather
than raw palette values:

- `bg-primary` through `bg-quinary`;
- `text-primary` through `text-quaternary`;
- `border-primary` through `border-tertiary`;
- `link`, `feedback`, `focus`, and `signal` roles.

Temporary unprefixed aliases support the existing admin styles while they are
migrated. New code may not use those aliases.

## Typography

The system uses a local system-font stack. No external font request is allowed
for the visual foundation.

- Display type: compact leading, carefully balanced wrapping, no forced
  gradients.
- Page title: one clear statement, normally no more than two visual lines.
- Section title: smaller than a hero and paired with one supporting idea.
- Body: comfortable measure, never full viewport width.
- Interface copy: compact, direct, and sentence case.
- Monospace: metadata, identifiers, measurements, and system evidence only.

Weight carries hierarchy before color. All important information must remain
clear when color is removed.

## Layout and responsive system

The core widths are:

- copy: `680px`;
- default content: `1120px`;
- wide composition: `1360px`.

Spacing follows a four-pixel base and named steps from `4px` to `128px`.
Responsive composition is content-led:

- mobile: one column, full-width controls, no horizontal dependency;
- compact: two-column arrangements only when both columns remain readable;
- desktop: asymmetric layouts are allowed when source order remains logical;
- wide: extra space increases breathing room, not uncontrolled line length.

Container, stack, cluster, surface, and section primitives should express the
common rules. A page should not repeat the same max-width and gutter formulas.

## Components

Components are promoted to `packages/ui` when they are visually and
behaviorally shared across applications. Public-only composition remains in
`apps/web`; authenticated operational composition remains in `apps/admin`.

Foundation component families:

- actions: button, button link, icon button, button group;
- layout: container, stack, cluster, section, surface, card, separator;
- forms: field, label, description, error, text input, textarea, select,
  checkbox, radio, switch, OTP;
- feedback: notice, badge, progress, spinner, skeleton, empty state;
- navigation: application navigation item, breadcrumbs, tabs, pagination;
- overlays: dialog, drawer, popover, tooltip, toast.

Every interactive component must define:

- default, hover, active, focus-visible, disabled, pending, and error states
  where applicable;
- a minimum 44-by-44-pixel touch target unless grouped dense controls have an
  equivalent accessible target;
- keyboard behavior and visible focus;
- reduced-motion behavior;
- accessible name and state exposure;
- server/client ownership.

Scaffolded registry entries are not production-ready components. A component
may be marked `styled` only when its states, accessibility, responsive
behavior, and tests are complete.

## Page composition

Public pages use a small set of compositional patterns:

- editorial hero;
- proof or evidence rail;
- narrative split;
- capability list;
- case-study frame;
- process sequence;
- article body;
- contact conversion panel.

The employee application uses:

- application shell;
- page header;
- command row;
- filter and search row;
- list/table view;
- detail inspector;
- editor workspace;
- confirmation and recovery flow.

These are compositions of primitives, not page-specific reinventions.

## Visual restraint rules

Avoid:

- gradients on ordinary text;
- glow behind every focal object;
- glass panels without a spatial reason;
- excessive rounded cards;
- large empty cards that exist only to fill a grid;
- 3D rotation used as decoration;
- decorative grids repeated across sections;
- multiple competing accent colors;
- icon-only actions without accessible names;
- motion that starts automatically without communicating state.

Use:

- hierarchy before decoration;
- borders before shadows;
- one accent before multiple accents;
- spacing before separators;
- real project evidence before invented mockups;
- component variants before copied CSS.

## Content reset

Before homepage and admin design begins, the public application exposes only
the `/` page. Its body renders no content at all. The header and footer are the
two deliberate exceptions: both are rebuilt from shared primitives and the new
semantic theme so they serve as reference implementations rather than legacy
page design.

Former contact, blog, work, project, service, legal, localized, and catch-all
page routes are removed from the application instead of being retained as
placeholders. The sitemap contains only the canonical homepage and crawling
remains enabled so the non-negotiable SEO release budget stays measurable
while the public surface is intentionally incomplete. Secure API handlers and
the token-gated CMS preview remain available because they are infrastructure
rather than public pages.

Existing content implementations remain recoverable in Git history and Sanity.
No provider data is deleted by the reset.

## Quality contract

Each visual slice must preserve:

- zero public authentication code;
- no secret or draft data in public components;
- static public rendering unless a documented feature requires otherwise;
- no new third-party browser origin without review;
- Lighthouse performance at least 95 and the other categories at 100;
- field Core Web Vitals targets;
- keyboard and screen-reader usability;
- WCAG AA contrast for text and controls;
- forced-colors and reduced-motion support;
- no layout shift from media or loading states;
- deterministic formatting, type checking, tests, builds, and clean worktree;
- protected-staging pull requests and post-merge assurance;
- no production change without explicit approval.

## Delivery order

1. Audit and remove conflicting theme assumptions.
2. Establish semantic tokens and explicit theme scopes.
3. Complete the shared layout and action primitives.
4. Replace public page bodies with neutral canvases.
5. Build the employee shell, navigation, page header, forms, lists, and editor
   compositions.
6. Build the public header, homepage, and footer from the same foundation.
7. Extend the system through Work, Case Study, Services, Process, About,
   Contact, Journal, and legal pages.
8. Reintroduce only approved, truthful content from Sanity.
9. Verify visual, accessibility, performance, security, and responsive
   behavior before each protected staging merge.

## Foundation acceptance criteria

The visual foundation is complete only when:

- public and admin theme scopes are explicit and deterministic;
- no new page-level palette or button implementation exists;
- shared primitives are documented, styled, accessible, and registered;
- public routes use the neutral canvas until their redesign is approved;
- the admin shell and homepage demonstrate the system at production quality;
- remaining routes use the same compositions and tokens;
- browser, accessibility, build, performance, and security gates pass;
- generated checks leave the worktree clean; and
- staging evidence exists without a production deployment.
