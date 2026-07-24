# Code and worktree hygiene

## Canonical commands

- `pnpm verify`: deterministic fast quality/security suite.
- `pnpm verify:release`: verification, both production builders, browser tests
  and Lighthouse.
- `pnpm clean:artifacts`: remove only enumerated generated reports/caches.

CI is authoritative. Local hooks must not become a second policy engine.

## Worktree rules

- Keep environment files, provider state, credentials and generated build
  output untracked.
- A verification command must either be read-only or restore the exact bytes it
  temporarily generated.
- Never place transitional code in a `legacy` directory. Remove it after the
  replacement slice passes parity and negative tests.
- Add shared behavior to the package named in `AGENTS.md`; do not create
  catch-all `utils`, `common` or application-crossing folders.
- Every new dependency must have one owner and one use case. Prefer platform
  APIs and existing tools.
- Do not add a formatter, linter, dependency updater, SAST scanner or local hook
  that overlaps the current toolchain without an ADR.

## Pull-request evidence

Every material pull request records:

- changed trust/data boundary;
- validation, authorization and failure-mode tests;
- migration/rollback impact;
- privacy/retention impact;
- performance/bundle impact;
- monitoring and recovery changes;
- generated output and worktree-clean result.

The merge candidate must finish with a clean `git status`, deterministic
lockfile/schema, zero warnings, zero prohibited cycles and no unaccepted
critical/high vulnerability.
