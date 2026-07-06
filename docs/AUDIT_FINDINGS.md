# Deployment Audit Findings

This document summarizes the current deployment-readiness picture for Nameplates Express after the latest workflow and PayPal cleanup pass.

## What Is Now Verified

- Canonical orders are persisted locally before n8n orchestration.
- Outbound n8n deliveries are logged with attempts, checksums, response state, and confirmation state.
- Duplicate n8n confirmations are accepted safely as no-op success.
- Quote/invoice orders remain retryable when n8n delivery fails.
- PayPal sandbox checkout now uses the real JavaScript SDK flow.
- PayPal orders are created, captured, and verified on the server before a paid order is finalized locally.
- Repeating the same PayPal capture finalization returns the existing order instead of creating a duplicate paid record.
- Public admin config responses keep secrets hidden while still exposing the safe PayPal client ID needed by the customer checkout screen.

## Remaining Deployment Cautions

These are not currently tracked as open blocking code issues in the local Gitea backlog, but they still matter before a true production rollout:

1. Live infrastructure values are still deployment-specific.
   - You need real n8n webhook values, callback/shared secrets, and email automation on the destination workflow.
   - You need live PayPal credentials and a live verification pass if moving beyond sandbox.

2. The local shell on this machine is still running Node.js `20.14.0`.
   - The workspace now enforces the supported baseline during install, but local shell builds still emit Vite engine warnings until the machine runtime is upgraded to Node `20.19+`, `22.12+`, or `24+`.
   - The Docker build already uses a supported runtime, so the local Docker deployment path remains the reliable validation path here.

3. Final operational acceptance is still environment-specific.
   - A real end-to-end order should be exercised against the intended local n8n instance, email destination, and PayPal sandbox accounts after configuration is entered in `/admin`.

## Recommended Release Gate

Treat the codebase as ready for continued local Docker validation and sandbox-connected workflow testing when all of the following are true:

- Docker stack is up and healthy.
- Admin workflow settings have been saved successfully.
- n8n receives a finalized order and sends back its confirmation callback.
- A PayPal sandbox checkout completes and produces a locally persisted `paid` order.
- A quote/invoice checkout completes and produces a locally persisted `invoiced` order.
- Proof artifacts are reachable through `proof.html` and `proof-package.json`.
