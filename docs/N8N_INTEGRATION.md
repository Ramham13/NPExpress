# n8n Integration Guide

Nameplates Express owns the canonical order record. n8n receives finalized order data after the website has already persisted the order locally.

## Responsibilities

| System | Responsibility |
| --- | --- |
| Website/API | Customer data capture, order persistence, payment/invoice state, lifecycle state, delivery audit logs, duplicate-send prevention |
| n8n | Email orchestration, invoice/receipt delivery, order-intake notification, proof/package routing, downstream business automation |

## Required Configuration

Configure these values in the admin page for local testing, or provide them as environment defaults:

```text
N8N_ORDERS_WEBHOOK_URL=
N8N_CALLBACK_SECRET=
N8N_SHARED_SECRET=
```

The admin page values are persisted in PostgreSQL and are the preferred test path. Environment values should be treated as fallback defaults.

## Outbound Website to n8n Handoff

When an order is finalized, the API:

1. Confirms the order is locally persisted.
2. Builds a stable order webhook payload.
3. Computes a payload checksum/identifier.
4. Records a delivery attempt.
5. Sends the payload to `N8N_ORDERS_WEBHOOK_URL`.
6. Leaves the order retryable until n8n confirms receipt.

Expected payload categories:

- order identifiers
- customer contact and shipping details
- line items
- nameplate configuration data
- proof references or proof payload metadata
- payment or invoice metadata
- lifecycle state
- delivery token/signature data for correlation

The outbound operation must remain idempotent. Retrying the same order should not cause duplicate external side effects in n8n.

## Suggested n8n Workflow

1. Webhook trigger receives the order payload.
2. Validate the shared secret/signature/token.
3. Validate required fields and schema version.
4. Store or reference the website order ID as the n8n idempotency key.
5. Generate internal proof/order documents as needed.
6. Send order-intake email to the configured business inbox.
7. Send receipt/invoice confirmation email to the customer.
8. POST confirmation back to the website callback endpoint.

## n8n Confirmation Callback

After n8n validates and accepts the payload, it should call:

```text
POST /api/webhooks/n8n/order-confirmation
```

The callback should include enough information for the website to correlate and confirm the delivery:

```json
{
  "orderId": "NX-YYYY-XXXXX",
  "deliveryId": "delivery-attempt-id",
  "status": "confirmed",
  "receivedAt": "2026-07-01T00:00:00.000Z",
  "message": "Payload received and parsed successfully"
}
```

The request should include the configured callback secret/signature. Duplicate confirmations should be accepted as no-op success, not treated as a new handoff.

## Failure and Retry Behavior

- If n8n cannot be reached, the order should remain in `n8n_failed` or another retryable state.
- If n8n receives the payload but never calls back, the order should remain pending confirmation.
- If the same order is retried after confirmation, the website should prevent a duplicate send.
- Each attempt should remain visible in the delivery audit log.

## Current Cautions

The local implementation is present and testable, but the deployment audit identified security and reliability issues that must be resolved before production use. See [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md).
