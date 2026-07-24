# Shapewebs security policy

## Supported versions

Shapewebs is under active development. Only the code on the protected `main`
branch is supported. Preview and development deployments are not production
services and contain synthetic data only.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's
private vulnerability reporting form:

<https://github.com/shapewebs/shapewebs-platform/security/advisories/new>

Include:

- the affected route, component, dependency, or configuration;
- reproduction steps and the expected security boundary;
- the observed impact;
- any proof-of-concept data with secrets and personal data removed.

Shapewebs will acknowledge a report within two business days. Do not access,
alter, retain, or disclose data that is not your own, and do not perform
denial-of-service or social-engineering tests.

## Remediation targets

| Severity                    | Target   |
| --------------------------- | -------- |
| Known exploited or critical | 24 hours |
| High                        | 7 days   |
| Moderate                    | 30 days  |
| Low                         | 90 days  |

Production releases are blocked by unaccepted critical or high-severity
findings. Any exception must name an owner, document compensating controls, and
include an expiry date.
