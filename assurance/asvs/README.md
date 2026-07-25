# ASVS evidence register

Shapewebs targets OWASP ASVS 5.0.0 Level 1 for static public functionality and
Level 2 for authenticated, administrative, lead and future customer
functionality.

## Pinned source

`catalog.lock.json` pins OWASP's stable `v5.0.0_release` flat JSON asset by its
SHA-256 digest. `catalog-index.json` is a deterministic, reduced index generated
from that asset. The index retains the version-qualified requirement ID, level,
chapter and section but not the requirement prose.

OWASP ASVS is licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The source
release and attribution remain recorded in the lock file and this document.

## Evidence states

`reviews.json` is the human-reviewed source of requirement decisions.
`evidence.json` is generated deterministically from those reviews plus every
remaining Level 1 and Level 2 requirement in the pinned catalog. Each
requirement must eventually have exactly one disposition:

- `implemented`: automated or inspected evidence proves the requirement;
- `manual`: a named, dated manual verification is required;
- `not_applicable`: the notes explain why the requirement cannot apply;
- `accepted_risk`: an owner, evidence, rationale and future expiry are present;
- `unreviewed`: temporary state that always fails the launch gate.

Broad control-area summaries in `docs/security/asvs-matrix.md` remain useful for
engineering orientation, but they do not replace this exact-ID register.

## Commands

- `pnpm security:asvs:generate` regenerates the complete evidence register from
  the pinned catalog index and human-reviewed decisions.
- `pnpm security:asvs:check` validates the pinned catalog and complete register
  structure, proves regeneration would be byte-for-byte clean, and reports
  reviewed and unreviewed counts.
- `pnpm security:asvs:gate` applies the production launch rule and fails if any
  target requirement is unreviewed or has incomplete evidence.
- `pnpm security:asvs:update -- <downloaded-flat-json>` regenerates the catalog
  and register only when the source bytes match the reviewed lock digest.

Updating ASVS requires a reviewed lock-file change. Never point the generator at
the moving OWASP `master` or bleeding-edge release for production assurance.
