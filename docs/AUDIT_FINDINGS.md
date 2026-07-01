# Deployment Audit Findings

This document summarizes the current deployment-readiness review for Nameplates Express. The application is suitable for local Docker testing, but it should not be treated as production-ready until the blocking items below are resolved.

## Scope Reviewed

- React customer ordering flow.
- Admin configuration flow.
- Express API routes.
- PostgreSQL-backed admin and order persistence.
- n8n outbound webhook sender and inbound confirmation callback.
- Docker Compose local deployment.
- Public repository hygiene.

## Blocking Issues Published to Local Gitea

The following issues were published to the local Gitea repository so the deployment backlog remains attached to the codebase:

| Issue | Title | Risk |
| --- | --- | --- |
| #16 | Lock down public order APIs to prevent PII disclosure and state tampering | Public order endpoints can expose or mutate sensitive customer/order data without sufficient authorization. |
| #17 | Public admin config endpoint leaks workflow secrets | Admin configuration responses can expose webhook and secret values that should be write-only or masked. |
| #18 | Quote confirmation screen loses the submitted cart before rendering | Quote confirmation can render incomplete order context after cart state changes. |
| #19 | Fallback n8n shared secret is a predictable hardcoded value | A predictable fallback weakens webhook trust if real secrets are not configured. |
| #20 | Client-generated order IDs are guessable and can overwrite pending orders | Client-side order identifiers should not be trusted as durable unique server identifiers. |
| #21 | Delivery retry audit trail never increments attempt numbers | Retry logs are harder to audit and reconcile because attempt numbering is not reliable. |
| #22 | Expired admin tokens leave the UI unlocked but break saves silently | Admin UX can appear authenticated even after writes fail due to token expiry. |
| #23 | Custom admin colors are accepted in config but render as black in previews | Saved product color configuration can differ from the customer preview experience. |
| #24 | Outbound n8n webhook calls can hang checkout because they have no timeout | A slow or unreachable n8n endpoint can degrade checkout/order submission responsiveness. |

## Highest Priority Fixes

1. Require authenticated, scoped access for order read/write endpoints.
2. Mask or omit stored secrets from admin configuration responses.
3. Replace predictable fallback webhook secrets with explicit required configuration.
4. Generate canonical order identifiers server-side.
5. Add timeout and retry controls around outbound n8n delivery.
6. Repair admin session expiry behavior so locked/expired sessions are obvious and recoverable.

## Production Readiness Checklist

- Resolve all blocking issues listed above.
- Add authorization and audit coverage for order APIs.
- Confirm that all secrets are provided through environment variables or secure admin write-only flows.
- Verify n8n sends the confirmation callback for each accepted order.
- Validate duplicate n8n callbacks are ignored safely.
- Verify order records survive container restarts.
- Run the frontend/API test suite from a clean dependency install.
- Run a real end-to-end checkout/quote workflow against the intended n8n instance.
- Review public repository contents for secrets before every push.

## Current Validation Notes

- The local Docker deployment has been used for browser testing at `http://127.0.0.1:8090`.
- Admin unlock, save, refresh, and persistence behavior have been manually validated in the local environment.
- The n8n handoff code path exists, but production use depends on resolving the security and reliability items above.
- Public repository publication should exclude `docker/.env.local`; use `docker/.env.local.example` as the committed template.
