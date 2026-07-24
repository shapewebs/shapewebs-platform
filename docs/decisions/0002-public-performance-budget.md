# ADR 0002: calibrate the public performance budget

- Status: accepted
- Date: 23 July 2026
- Decision owners: Shapewebs

## Context

The draft foundation plan proposed a 130 KiB ceiling for total JavaScript on a
marketing route. The completed homepage and global marketing shell contain no
Client Components, no analytics, and no third-party requests. A three-run
production Lighthouse baseline still transfers 157,906 bytes of script because
the Next.js App Router runtime dominates the total.

A threshold that already fails a zero-island page cannot distinguish an
application regression from the framework floor. Quietly removing the budget
would be worse; keeping an impossible number would train contributors to ignore
the gate.

## Decision

Enforce these homepage pull-request budgets with three Lighthouse runs and the
median:

- performance score at least 95;
- accessibility, best practices, and SEO scores exactly 100;
- FCP at most 1.8 seconds;
- LCP at most 2.5 seconds;
- TBT at most 150 milliseconds;
- CLS at most 0.05;
- script transfer at most 165,000 bytes;
- total transfer at most 210,000 bytes;
- zero third-party requests.

The 165,000-byte script ceiling leaves approximately 7 KiB above the measured
baseline. It is a total-route ceiling, not a license to add a site-wide client
runtime. The homepage and global shell remain Server Components. A new public
Client Component or third-party origin requires an explicit reason and a
measured before/after result.

## Consequences

- CI has a tight, reproducible gate that the smallest valid Next.js page can
  pass.
- Framework upgrades can consume the remaining headroom; their pull requests
  must record a new baseline.
- A threshold change requires another architecture decision with measurements.
- Route-specific budgets will be added as real case studies and media land.
- Real-user Core Web Vitals remain more important than a local lab score after
  launch.
