# Shapewebs Component System

## Styling Strategy

- Global CSS in `packages/ui/src/styles/system-theme.css` is reserved for shared design tokens, theme variables, and truly global foundations.
- Component styling lives next to each component in a colocated `.module.css` file.
- This follows the official Next.js recommendation to keep global CSS for truly global concerns and use CSS Modules for scoped custom component styling.

## Import Strategy

- Category imports:
  - `@shapewebs/ui`
- Namespace import from the system root:
  - `import { Buttons, Forms } from "@shapewebs/ui"`

## Current Status

- Styled now: `Button`, `ButtonGroup`, `CloseButton`, `ToggleButton`, `ToggleButtonGroup`, `Navigation.Link`
- Scaffolded only: every other listed component. The file structure and CSS Modules exist, but behavior and styling still need to be built.

## Registry

- Check `packages/ui/src/system/registry.ts` before extending or using a component.
- Components marked `scaffolded` should be treated as placeholders, not finished UI.
