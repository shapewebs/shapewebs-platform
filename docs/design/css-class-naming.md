# CSS class naming

## Contract

Every authored class uses exactly three lowercase segments:

```text
scope-role-id6
```

- `scope` identifies the component or composition that owns the class.
- `role` identifies the class's purpose within that scope.
- `id6` is a globally unique six-character lowercase alphanumeric identity.

Examples:

```text
button-root-k3m8q2
button-primary-r6t1w9
header-shell-f4n7x2
adminshell-sidebar-b9c3v6
```

There is no repository-wide `sw-` or `ui-` prefix. The scope already provides
the useful ownership information.

The exact grammar is:

```regex
^[a-z][a-z0-9]*-[a-z][a-z0-9]*-[a-z0-9]{6}$
```

## Choosing semantic segments

Use the component name for reusable UI, such as `button`, `spinner`, or
`submenu`. Use the composition name for application-owned layout, such as
`header`, `adminshell`, or `blogeditor`.

Roles describe purpose rather than appearance. Prefer `root`, `content`,
`trigger`, `title`, `primary`, or `error`. Do not use generic scopes such as
`sw` or `ui`, and do not use incidental names such as `blue`, `left`, or
`largebox` when a semantic role exists.

Multiword scopes and roles are written as one lowercase alphanumeric segment,
for example `buttongroup`, `panellink`, or `imagewide`. This keeps the grammar
unambiguous.

## Identity rules

- An `id6` belongs to one distinct class in the whole repository.
- Never copy an existing suffix to a new class, even across CSS Modules.
- The suffix has no design meaning and must never be selected by prefix or
  substring.
- Renaming a class's semantic scope or role creates a new identity.
- CSS state uses pseudo-classes, ARIA attributes, or data attributes rather
  than unscoped state classes.
- All authored classes live in CSS Modules. Global foundation styles use
  elements and attributes, not global classes. Do not add raw class-name
  literals to React markup.

## Developer workflow

Generate a collision-free name from the repository root:

```bash
pnpm css:class:create button primary
```

Use the returned name in both the CSS Module and its bracket-notation
reference:

```css
.button-primary-r6t1w9 {
  /* approved component styles */
}
```

```tsx
styles["button-primary-r6t1w9"];
```

Then run:

```bash
pnpm css:classes:check
```

The check rejects malformed names, generic scopes, duplicate names or IDs,
stale CSS Module references, and raw class-name literals. It runs as part of
`pnpm verify`, so CI is authoritative.

Element selectors, pseudo-classes, pseudo-elements, keyframe names, and
attribute selectors are not custom classes. Any authored class used alongside
them still follows this contract.
