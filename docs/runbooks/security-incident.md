# Security incident and data-breach runbook

## Trigger

Use this runbook for suspected unauthorized access, secret exposure, malicious
deployment, tenant isolation failure, personal-data disclosure, destructive
change or provider compromise.

## First 30 minutes

1. Record UTC time, reporter, affected service and a dedicated incident ID.
2. Preserve relevant deployment, audit and provider evidence; do not copy
   secrets or personal data into chat or tickets.
3. Contain the smallest safe boundary:
   - revoke the affected session/token/key;
   - disable the affected integration or route;
   - roll back a malicious/broken deployment;
   - block abusive traffic at the WAF;
   - isolate the affected database branch.
4. Confirm public site, lead acceptance and admin readiness independently.
5. Do not delete forensic evidence or rotate every credential without mapping
   which evidence and services depend on it.

## Assess

- What data, tenant, account, deployment and time range are affected?
- Was confidentiality, integrity or availability compromised?
- Is access ongoing?
- Which logs/audit events are trustworthy?
- Did a browser receive data it was not authorized to receive?
- Could a leaked credential grant broader provider access?
- Is personal-data breach notification assessment required?

The controller records the decision and rationale even if notification is not
required. Escalate legal/regulatory timing decisions immediately; engineering
must not make that decision silently.

## Eradicate and recover

1. Patch the root cause and add a regression/negative test.
2. Rotate only mapped affected credentials, then verify old credentials fail.
3. Revoke affected sessions and invalidate step-up state.
4. Restore from known-good data if integrity is uncertain.
5. Run authorization, dependency, browser and readiness checks.
6. Promote a verified candidate with rollback ready.
7. Monitor elevated indicators until the owner closes the incident.

## Follow-up

Within five business days:

- publish an internal timeline and impact statement;
- update the threat model and ASVS evidence;
- record detection and response gaps;
- assign corrective actions with owners/dates;
- review whether retention, access, provider or recovery controls change;
- rehearse the fixed scenario in the next quarterly tabletop.
