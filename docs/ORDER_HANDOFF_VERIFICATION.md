# Order Handoff Verification

Use this checklist after deployment changes to verify the website-to-n8n order handoff path end to end.

## Purpose

This verifies the exact sequence the application is supposed to own:

1. create and persist the canonical local order
2. create a delivery audit row
3. send the finalized order payload to n8n
4. accept the n8n confirmation callback
5. ignore duplicate confirmations safely

## Preconditions

- The Docker stack is running.
- Admin unlock works at `/admin`.
- Admin workflow settings include a reachable `n8nOrdersWebhookUrl`.
- Admin workflow settings include valid PayPal sandbox credentials if you are testing the paid checkout path.
- The n8n workflow is configured to call back to:

```text
POST /api/webhooks/n8n/order-confirmed
```

- The local database is healthy.

## Verification Flow

### 1. Public health

Confirm the public app and API are reachable:

```text
GET /api/health
```

Expected:

- `200`
- body contains `{"status":"ok"}`

### 2. Public admin safety

Confirm public callers do not receive workflow secrets:

```text
GET /api/admin/config
```

Expected:

- `200`
- sizes are returned
- only safe workflow fields are visible to unauthenticated callers
- order administration routes such as `GET /api/orders` return `401`

### 3. Admin unlock

Unlock the admin panel and confirm authenticated config access works.

Expected:

- `/admin` unlock succeeds
- authenticated `GET /api/admin/config` returns the full workflow settings

### 4. Finalize a quote or paid order

From the customer flow, submit either:

- a PayPal path order
- an invoice/quote path order

Expected:

- the confirmation screen renders a real order ID
- the submitted cart remains visible on the confirmation screen
- the live design cart is cleared only after confirmation state is preserved
- PayPal orders are only accepted after the server verifies a completed capture
- repeated submission of the same PayPal capture returns the existing local order instead of creating a duplicate

### 5. Local persistence

From the admin panel or API, inspect the created order.

Expected:

- a canonical order row exists
- `orderId` was generated on the server
- the order state is one of:
  - `queued_for_n8n`
  - `n8n_sent`
  - `n8n_failed`
  - `n8n_confirmed`

### 6. Delivery audit row

Inspect the order delivery attempts.

Expected:

- a delivery attempt row exists for the order
- `attempt_number` starts at `1`
- request payload and checksum are stored
- response status and confirmation state are populated

### 7. n8n callback

Allow n8n to call back with the order token.

Expected:

- the website accepts the callback
- the order transitions to `n8n_confirmed`
- the latest delivery attempt is updated to `confirmed`
- `n8n_ack_received_at` is stored

### 8. Duplicate callback

Send the same confirmation callback a second time.

Expected:

- the response is a safe no-op success
- the order remains `n8n_confirmed`
- no new delivery attempt row is created
- no existing historical attempt rows are rewritten incorrectly

### 9. Retry behavior

Force a delivery failure by disabling n8n or pointing to an unreachable webhook, then trigger a retry from the admin view.

Expected:

- the order moves to `n8n_failed` on timeout or failed response
- the retry creates a new delivery attempt row
- `attempt_number` increments monotonically
- a later successful retry moves the order to `n8n_sent` and then `n8n_confirmed`

## Current Notes

- PayPal checkout is wired for sandbox mode. A live production rollout still requires live PayPal credentials, live n8n/email wiring, and a deployment-specific verification pass.
- The printable proof path is now `proof.html`, with `proof-package.json` as the structured intake artifact.
