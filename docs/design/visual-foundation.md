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

The public theme defaults to the intentional dark presentation. A persistent
footer selector offers Light, System, and Dark preferences. Only the System
option follows `prefers-color-scheme`, including changes made while the page is
open; an explicit Light or Dark choice remains stable across visits.

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

Every authored class follows the repository-wide
[`scope-role-id6` contract](./css-class-naming.md). The class scope identifies
its real component or composition; there is no universal namespace prefix.

Tokens use direct semantic names such as `--content-width`, `--space-4`, and
`--color-text-primary`. New code must use semantic roles rather than raw
palette values:

- `bg-primary` through `bg-quinary`;
- `text-primary` through `text-quaternary`;
- `border-primary` through `border-tertiary`;
- `link`, `feedback`, `focus`, and `signal` roles.

The shared theme is the single source of truth; compatibility aliases are not
part of the contract.

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
- wide composition: `1344px`.

Spacing follows a four-pixel base and named steps from `4px` to `128px`.
Responsive composition is content-led:

- mobile: one column, full-width controls, no horizontal dependency;
- compact: two-column arrangements only when both columns remain readable;
- desktop: asymmetric layouts are allowed when source order remains logical;
- wide: extra space increases breathing room, not uncontrolled line length.

Container, stack, cluster, surface, and section primitives should express the
common rules. A page should not repeat the same max-width and gutter formulas.

### Radius and action hierarchy

Shapewebs uses a rounded, structured geometry rather than a uniformly pill-like
interface. The shared radius scale has explicit jobs:

- `6px` (`--radius-xs`) for dense navigation and compact controls;
- `8px` (`--radius-sm`) for standard form fields and supporting controls;
- `12px` (`--radius-md`) for cards and contained surfaces;
- `14px` (`--radius-lg`) for floating navigation, popovers, dialogs, and major
  panels;
- `20px` (`--radius-xl`) for rare feature frames with enough visual space; and
- `--radius-rounded` for buttons, circles, toggles, status pills, and other
  intentionally pill-shaped controls. Button sizes share this radius rather
  than introducing size-specific curves.

The neutral `primary` button remains the normal high-priority action. The
colored `brand` kind uses the Shapewebs primary blue and is reserved for a
single deliberate conversion or onboarding emphasis within a composition. It
must not become the default treatment for every action.

Buttons and other interactive components communicate hover and active state
through color, border, shadow, and opacity only. They must not translate,
scale, rotate, or otherwise move in response to pointer or keyboard
interaction. Transform-based motion remains available only for functional
state communication such as a toggle thumb, spinner, or the approved submenu
open-and-switch transition.

Button shadows are component tokens rather than page-owned effects. Primary,
brand, and the implicit default use `--shadow-button-default`. Secondary uses
`--shadow-button-secondary`, with only its 0.5-pixel boundary becoming stronger
through `--shadow-button-secondary-hover`. The shared Shapewebs brand color is
`rgb(102 121 221)` with a slightly darker hover state. Its label uses the active
theme's `--color-bg-primary` surface color. Shared button controls have no
physical border; any visible boundary is rendered by their component-owned
shadow. Forced-colors mode uses an explicit outline so the controls remain
perceivable under system colors.

Shared buttons and all items in the public navigation use
`--font-weight-normal`. Typography must not become heavier on hover, focus,
selection, or submenu activation.

Button visual heights are `32px` for small, `38px` for medium, and `44px` for
large. Small and medium buttons extend an invisible interaction area to `44px`
without changing their visible geometry, preserving a comfortable touch target
inside denser navigation and application layouts.

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

### Customization approval rule

Shared components use their standard kind, size, spacing, radius, color, and
motion contracts by default. Application composition may place a component in
layout, but it must not restyle that component into a one-off visual variant.

A new component-specific override or shared variant requires explicit owner
confirmation before implementation. Once approved, a reusable variant belongs
in `packages/ui` with a named contract and verification; it must not live as an
undocumented page-specific CSS exception.

### Public navigation contract

The public header uses one code-owned `SubmenuNavigation` component. Its direct
links, submenu sections, supporting descriptions, and action are serializable
configuration; the brand and the surrounding shell remain server-rendered.
Reusable client controls can occupy typed navigation slots. The public search
control uses that contract so it is the final main-navigation item before the
account separator on both desktop and compact layouts.

On desktop, Services and Studio share one floating surface rather than opening
independent popovers. The surface:

- measures the active panel and transitions its width and height in place;
- shifts outgoing and incoming content by only a few pixels to preserve
  direction without turning navigation into a carousel;
- stays open across a quick pointer move between submenu triggers, while a
  short grace period closes it when the user settles on a direct link;
- opens by hover, click, Enter, or Arrow Down and closes by Escape, outside
  interaction, or focus leaving the navigation; and
- removes animation under `prefers-reduced-motion` and preserves structure in
  forced-colors mode.

Every desktop navigation link and submenu trigger uses the shared small-button
visual height of `32px`, including the primary navigation action. Text links
and ghost triggers extend an invisible vertical interaction area to `44px` so
the compact header does not reduce usability.

On compact screens, the same typed destinations become a button-controlled
drawer with one expandable submenu at a time. Closed content is both
`aria-hidden` and inert. The public client boundary contains only this
interaction controller; opening navigation must not trigger a CMS, database,
or third-party request.

Navigation motion is functional and restrained: approximately 150–240 ms,
small translation, no bounce, no automatic loop, and no focus trap for the
non-modal desktop surface.

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
