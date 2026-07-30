# Sanity content lifecycle verification — 30 July 2026

## Scope

This record proves the fixed-staging employee publishing story across every
material boundary:

1. an allowlisted employee authenticates with Google and Shapewebs TOTP;
2. the employee portal reserves and submits an idempotent Sanity command;
3. Sanity retains an editable draft while removing the published document;
4. the signed Sanity webhook is accepted and stored durably in Neon;
5. the public deployment revalidates the exact route to `404`; and
6. the exact synthetic draft and its now-unreferenced test asset are removed.

Only the public Sanity `staging` dataset, the persistent synthetic Neon staging
branch, and the two protected fixed-staging Vercel deployments were in scope.
Production remained on commit `33affde`; no production dataset, credential,
database, deployment, or domain was changed.

## Deployment baseline

| Boundary                    | Verified state                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Protected repository branch | `staging` at `0499de514f780207533d30d098406d92d604e2b1`                                   |
| Admin deployment            | `admin-staging.shapewebs.com`, commit `0499de5`                                           |
| Public deployment           | `staging.shapewebs.com`, commit `0499de5`                                                 |
| Sanity                      | Project `42f6331k`, dataset `staging`; no production dataset                              |
| Neon                        | Project `morning-firefly-02206914`, branch `br-long-shape-askqaw2d`, database `shapewebs` |
| Applied migrations          | 19 journal entries, `0000` through `0018`                                                 |
| Production baseline         | `33affde883340d9db1d53d89ffd0c49d73fb531f`                                                |

Pull requests
[`#52`](https://github.com/shapewebs/shapewebs-platform/pull/52) and
[`#53`](https://github.com/shapewebs/shapewebs-platform/pull/53) repaired the
provider action, command reconciliation, webhook-header parsing, malformed
public slug handling, and the reviewed Vercel image-optimizer ZAP disposition.
Post-merge staging run
[`30518895512`](https://github.com/shapewebs/shapewebs-platform/actions/runs/30518895512)
passed k6 and ZAP against `0499de5`.

## Synthetic fixture

| Resource                              | Exact identifier                                                |
| ------------------------------------- | --------------------------------------------------------------- |
| Blog document                         | `blog-post-4855dbbd-00ef-4c0f-b000-c3af82454d2a`                |
| Public slug                           | `shapewebs-staging-content-assurance-20260730`                  |
| Test image asset                      | `image-86956c515d66aa846a42d356a4533cf0f545615d-3200x3200-webp` |
| Published revision before unpublish   | `402b1067-69ae-4221-97f3-d23286152198`                          |
| Successful unpublish command/revision | `385f73fa-8811-47ea-b5c6-8fbd43659502`                          |

The test image was a 46,586-byte normalized WebP. It was referenced only by the
synthetic article.

## Failure and recovery evidence

The first live unpublish attempt used an unsupported hand-built Sanity
transaction shape. The provider outcome could not be confirmed, so command
`c9025015-ad8c-46b7-9a40-029bfec123f2` was reconciled to `uncertain` with
failure code `provider_outcome_unconfirmed`. An immutable failure audit event
records that result. The command was not replayed blindly.

The repaired implementation uses Sanity's supported document-unpublish action.
It also verifies the raw webhook signature before validating provider delivery
metadata and accepts Sanity's structured idempotency-header representation.

## Successful end-to-end result

| Boundary                | Result | Authoritative evidence                                                                                                                      |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee authentication | Passed | New Google session followed by a successful Shapewebs TOTP step-up                                                                          |
| Employee UI             | Passed | Editor changed from `Published: yes` to `Published: not yet` and reported that the draft was retained                                       |
| Provider mutation       | Passed | Sanity raw perspective contained only `drafts.blog-post-…` at revision `385f73fa…`; published perspective returned no document              |
| Provider command        | Passed | Neon command `385f73fa…` is `succeeded`, has the same provider transaction ID, no failure code, and completed at `2026-07-30T06:36:51.842Z` |
| Immutable audit         | Passed | `content.blog_post_unpublished` records `result=success`, provider `sanity`, and the exact command ID                                       |
| Signed webhook          | Passed | Sanity hook log at `2026-07-30T06:36:51.686Z` returned `200`                                                                                |
| Durable receipt         | Passed | Neon stored `sanity:ufixGo6xUb1iYCS30KSJ2g` as `blogPost.delete`, bound to provider transaction `385f73fa…`                                 |
| Public response         | Passed | Protected Vercel probe returned `HTTP/2 404`, `x-vercel-cache: REVALIDATED`, CSP, HSTS, `nosniff`, and frame denial                         |
| Browser health          | Passed | No error or warning console entries followed the mutation                                                                                   |

The later public probe returned the same secured `404` with
`x-vercel-cache: HIT`, proving that the removed article did not reappear after
cleanup.

## Cleanup evidence

Cleanup was deliberately sequenced:

1. delete only
   `drafts.blog-post-4855dbbd-00ef-4c0f-b000-c3af82454d2a`;
2. query the raw dataset and verify both document IDs are absent;
3. verify the exact image asset reference count is zero;
4. delete only
   `image-86956c515d66aa846a42d356a4533cf0f545615d-3200x3200-webp`;
5. query again and verify the document, draft, and asset arrays are empty and
   the reference count remains zero; and
6. load the authenticated blog list and verify it reports no blog posts.

The Neon command, audit, preview-grant, and webhook receipt records were
retained because they are assurance evidence, not disposable content.

## Conclusion

The Sanity publishing foundation is complete for staging. The real employee
journey has now proven structured editing, normalized public media,
exact-revision preview, fresh-TOTP publishing and unpublishing, idempotent
provider commands, ambiguous-outcome reconciliation, signed webhook
acceptance, durable deduplication evidence, protected cross-project
revalidation, public `404`, and reference-safe cleanup.

This clears the content-foundation gate for public-site design work. It does
not clear production launch: the separate production providers, commercial
Vercel plan, protected production Neon topology, WAF/distributed rate limits,
monitoring alerts, legal/retention approvals, and recovery exercises remain
explicit launch gates.
