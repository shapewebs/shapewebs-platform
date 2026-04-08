# Shapewebs Site Metadata Brief

## Brand Positioning

- Company name: `Shapewebs`
- Positioning statement: `Shapewebs introduces the magic back into software.`
- Positioning substatement: `Beautiful, fast websites built with intention. Designed to feel alive, intuitive, and human.`

## Default SEO Copy

- Default site title: `Shapewebs`
- Title template: `%s | Shapewebs`
- Default meta description:
  `Shapewebs introduces the magic back into software through beautiful, fast websites built with intention to feel alive, intuitive, and human.`
- Preferred Open Graph title:
  `Shapewebs | Beautiful, fast websites built with intention`
- Preferred Open Graph description:
  `Shapewebs introduces the magic back into software with beautiful, fast websites designed to feel alive, intuitive, and human.`

## Core SEO Principles

- The main Shapewebs website is code-owned, not CMS-owned.
- Route metadata should live alongside each route in the web app.
- Core public pages should keep canonical tags, Open Graph data, Twitter cards, and structured metadata in code.
- Placeholder or unfinished routes should be marked `noindex`.
- Duplicate or secondary routes should canonicalize to one primary route.

## Route Strategy

- Primary domain target: `https://shapewebs.com`
- Admin domain: `https://admin.shapewebs.com`
- Public routes should use one canonical URL each.
- The current `/work` routes are treated as secondary portfolio routes and should not be indexed while `/projects` remains the primary portfolio surface.

## Brand Palette

Built from the existing Shapewebs blue and the near-black already present in the icon set.

- Ink: `#08090A`
- Paper: `#FBFBFB`
- Accent blue: `#007AFF`
- Deep blue: `#005DCC`
- Blue mist: `#EAF3FF`
- Blue fog background: `#F6FAFF`

## Asset Inventory

Source assets supplied:

- `shapewebs-icon.svg`
- `wordmark.svg`
- `logo-dark.svg`
- `logo-light.svg`
- `favicon.svg`
- `favicon.png`
- `og-default.png`

Generated app assets:

- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon-48x48.png`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-256.png`
- `icon-512.png`

## Remaining Optional Assets

These are not blockers for the current SEO implementation, but would improve future polish:

- Dedicated monochrome Safari mask icon
- Dedicated dark-mode Open Graph image
- Brand-specific social avatar exports
- If desired later: a handcrafted multi-resolution `favicon.ico`
