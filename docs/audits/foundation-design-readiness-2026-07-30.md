# Foundation and design-start readiness — 30 July 2026

## Decision

The protected staging foundation is technically ready for Shapewebs
public-site discovery and visual design once this evidence-only change passes
the normal pull-request gates. This decision does not authorize production
promotion.

Public design can proceed without weakening or replacing the proven platform
boundaries:

- `apps/web` remains the static-first public surface;
- `apps/admin` remains the employee CMS and company-operations surface;
- Sanity remains the source of structured public content and public media;
- Neon remains the source of identity, authorization, audit, idempotency,
  leads, customer/company operations, and provider assurance;
- private Vercel Blob remains the confidential-file boundary; and
- `apps/portal` remains an isolated, invitation-only, fail-closed future
  customer realm.

## Requirement audit

| Requirement                | Status                       | Authoritative evidence                                                                                                                                  |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public/admin separation    | Passed                       | Independent Next.js applications, boundary gate, separate deployments and secrets                                                                       |
| Clean reproducible tree    | Passed; reconfirm in this PR | Canonical `pnpm verify`, generated-schema checks, Knip, cycle and boundary gates                                                                        |
| Protected repository       | Passed                       | Active ruleset `19675880` covers `main` and `staging`, requires pull requests, linear history, resolved conversations, CI, Neon, and both Vercel checks |
| Supply-chain controls      | Passed on staging            | SHA-pinned Actions, CodeQL, OSV, dependency review, secret scanning and push protection; current local audit clean                                      |
| ASVS assurance             | Passed for current scope     | 253 of 253 ASVS 5.0 Level 1/2 controls have evidence-backed dispositions and deterministic launch-gate coverage                                         |
| Employee identity          | Passed                       | One employee identity supports Google, verified password, or both, followed by the same server-enforced TOTP step-up                                    |
| Sensitive authorization    | Passed                       | Server-created authorization context, per-handler/action reauthorization, fresh-step-up gates, forced RLS and negative-persona tests                    |
| Session security           | Passed                       | Fixed eight-hour lifetime, 30-minute inactivity, revocation, token rotation, replay-resistant TOTP counters and lockout                                 |
| Structured website content | Passed                       | Real Sanity create/save/preview/publish/unpublish/cleanup lifecycle on fixed staging                                                                    |
| Public media               | Passed                       | Normalized image upload, metadata/alt validation, Sanity asset reference checks and reference-safe deletion                                             |
| Confidential files         | Passed as a foundation       | Private Vercel Blob store, OIDC, validated normalization, tenant-aware metadata/RLS, ambiguous-outcome cleanup rules                                    |
| Lead durability            | Passed                       | Lead and outbox commit atomically; Turnstile, bounded validation, idempotency and RLS evidence                                                          |
| Transactional email        | Passed on staging            | Five-minute external scheduler, Resend delivery/bounce/replay evidence, durable worker state and signed webhooks                                        |
| Observability              | Passed on staging            | Redacted structured logs, OpenTelemetry, liveness/readiness, Checkly checks and controlled alert recovery                                               |
| Security/load scanning     | Passed                       | Post-merge run `30518895512` passed k6 and ZAP against exact fixed-staging deployments                                                                  |
| Provider failure behavior  | Passed                       | Unconfirmed Sanity command reconciled to `uncertain`; supported retry succeeded without blind replay                                                    |
| Cleanup                    | Passed                       | Synthetic Sanity document, draft and asset absent; zero asset references; public route stays `404`                                                      |
| Production isolation       | Passed                       | Production remains at `33affde`; no production database, dataset, credential, deployment or domain changed                                              |

## Security-alert interpretation

GitHub currently reports 79 open Dependabot alerts on the default production
branch: 43 high, 28 moderate, and 8 low. Code scanning and secret scanning each
report zero open alerts. The Dependabot findings belong to the deliberately
old `main` dependency graph; protected `staging` passes OSV, dependency review,
the tracked dependency-patch verifier, and `pnpm audit`.

This does not block visual work on `staging`, but it does block any claim that
production dependencies are remediated. GitHub must re-evaluate the alerts
after a separately approved, reviewed production promotion.

## Work that can proceed now

The next phase may:

1. decide launch market, language, ideal client, minimum project size, services
   and studio voice;
2. inventory real projects, testimonials, images and measurable results;
3. produce three Shapewebs visual directions;
4. select one direction and encode its tokens/components in `packages/ui`;
5. implement the public Home, Work, Case Study, Services, Process, About,
   Contact and legal surfaces; and
6. extend the employee CMS with the page, service, project and case-study
   schemas required by the selected public design.

Every public slice still has to pass the existing accessibility, performance,
third-party-origin, security-header, browser, k6 and ZAP gates.

## Remaining production launch gates

These are deliberately deferred and must not be confused with design-start
readiness:

- a commercial Vercel plan and reviewed production deployment protection;
- a separate paid production Neon project with a protected branch,
  production-only runtime/migrator roles, point-in-time recovery and a recorded
  restore rehearsal;
- production Turnstile, Resend, webhook and minute-level scheduling resources;
- production WAF/distributed rate limits, spend controls and tested alerts;
- production monitoring and incident, rollback, restore, secret-rotation and
  owner-recovery exercises;
- approved processor/DPAs, privacy language and legal retention schedules;
- production OAuth origins and credentials;
- reviewed resolution of default-branch dependency alerts; and
- explicit user approval before any production promotion.

## Deferred product scope

The fail-closed customer portal foundation is intentionally not a prerequisite
for designing the public site. Before customer launch it still requires its
own Vercel project and domain, OAuth client, provider credentials, monitored
staging deployment, invitation journey, private-file delivery, accessibility,
load, recovery and tenant-isolation evidence.

The employee CMS publishing foundation is proven with blog content. Additional
website document types are product work for the design/content phase, not a
reason to replace the proven Sanity/Neon/Blob architecture.
