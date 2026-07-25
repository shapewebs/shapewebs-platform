# Staging assurance sequencing verification — 25 July 2026

## Scope

This record verifies that push-triggered staging security and reliability
scans wait for both fixed Vercel deployments of the exact protected
`staging` commit. It does not authorize or describe a production deployment.

## Control

Pull request
[`#27`](https://github.com/shapewebs/shapewebs-platform/pull/27) added a
bounded deployment-status gate to the staging assurance workflow and was
squash-merged into protected `staging` at
`d22ca305e46289706104433f8a9bee0a455fd168`.

For push events, the workflow:

- has read-only access to commit statuses;
- polls only the exact repository and workflow commit;
- requires the exact `Vercel – shapewebs-web` and
  `Vercel – shapewebs-admin` contexts;
- treats only the newest status for each exact context as authoritative;
- starts k6 and ZAP only after both contexts report success;
- fails immediately on a terminal deployment failure; and
- times out after ten minutes without printing tokens or provider response
  bodies.

Three deterministic unit tests cover success, newest-status selection and
terminal failure. The canonical verification gate passed with 116 unit tests.

## Push-triggered proof

GitHub Actions run
[`30178108239`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30178108239)
ran against the exact merge commit:

- the wait step started at `2026-07-25T22:43:29Z`;
- the public Vercel context reached success at
  `2026-07-25T22:43:49Z`;
- the admin Vercel context reached success at
  `2026-07-25T22:44:13Z`;
- the wait step completed at `2026-07-25T22:44:21Z`;
- k6 then ran from `22:44:21Z` through `22:44:26Z`;
- ZAP then ran from `22:44:26Z` through `22:45:18Z`; and
- the complete workflow finished successfully at
  `2026-07-25T22:45:20Z`.

The observed sequence proves that neither staging scan began against the
previous deployment. The earlier manually dispatched run
[`30177841421`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30177841421)
remains valid evidence for merge commit `52680c4`; future protected-staging
pushes now enforce the ordering automatically.
