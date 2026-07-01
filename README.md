# Nameplates Express

Nameplates Express is a browser-based ordering platform for custom anodized aluminum nameplates. Customers can configure plate size, color, text layout, bulk CSV rows, cart contents, and checkout details. The application persists admin configuration and canonical order records locally, then hands finalized orders to n8n for downstream email, invoice, and order-intake orchestration.

The repository currently represents a local Docker testing environment and public source mirror. It is functional for local validation, but it still has blocking production-readiness issues tracked in the local Gitea issue list and summarized in [docs/AUDIT_FINDINGS.md](docs/AUDIT_FINDINGS.md).

## Current State

- Frontend: React, Vite, TypeScript, Tailwind, shadcn-style UI primitives.
- API: Express running under Node.js.
- Database: PostgreSQL in the Docker stack for admin configuration and order workflow state.
- Local runtime: Docker Compose publishes the app at `http://127.0.0.1:8090`.
- Admin route: `/admin`, unlocked by the local environment password.
- n8n integration: outbound finalized-order webhook plus inbound confirmation callback.
- Public GitHub remote: `https://github.com/Ramham13/NPExpress.git`.
- Local Gitea mirror: used as an isolated backup and issue tracker.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `artifacts/nameplates-express` | Main React customer/admin application |
| `artifacts/api-server` | Express API for admin config, order persistence, and n8n handoff |
| `lib/db` | Shared database schema and connection helpers |
| `lib/api-spec` | OpenAPI specification |
| `lib/api-client-react` | Generated React-facing API client |
| `lib/api-zod` | Generated Zod API types |
| `docker` | PostgreSQL init scripts and local environment template |
| `docs` | Deployment, audit, and n8n integration notes |

## Local Docker Setup

1. Create the local environment file:

   ```powershell
   Copy-Item docker/.env.local.example docker/.env.local
   ```

2. Edit `docker/.env.local` for the local machine. Keep this file private; it is ignored by git.

3. Build and start the stack:

   ```powershell
   docker compose up -d --build
   ```

4. Open the site:

   - Customer app: `http://127.0.0.1:8090/`
   - Admin app: `http://127.0.0.1:8090/admin`
   - API health: `http://127.0.0.1:8090/api/health`

5. Stop the stack:

   ```powershell
   docker compose down
   ```

The Compose stack starts the web/API container and a PostgreSQL container. Database-backed admin configuration and order workflow state persist in the configured Docker volumes until those volumes are removed.

## Development Without Docker

Install workspace dependencies with pnpm, then run the workspace scripts from the repository root:

```powershell
pnpm install
pnpm -C artifacts/nameplates-express dev
pnpm -C artifacts/api-server dev
```

The local development path expects compatible Node.js and pnpm versions. If pnpm is not available globally, use Corepack or `npm exec pnpm@<version>` from a Node.js environment.

## Runtime Routes

| Route | Description |
| --- | --- |
| `/` | Customer-facing storefront and nameplate designer |
| `/admin` | Admin configuration dashboard |
| `/cart` | Cart review |
| `/checkout` | Customer checkout flow |
| `/checkout/done` | PayPal completion screen |
| `/quote/done` | Manual quote completion screen |
| `/api/health` | API health check |
| `/api/admin/unlock` | Admin password unlock endpoint |
| `/api/admin/config` | Admin configuration read/write endpoint |
| `/api/orders` | Local order creation/listing endpoint |
| `/api/orders/:orderId/n8n/send` | Outbound n8n send trigger |
| `/api/webhooks/n8n/order-confirmation` | Inbound n8n confirmation callback |

## Order Lifecycle

The website remains the source of truth for customer order data. n8n is treated as a downstream orchestration layer only.

Supported lifecycle states include:

- `draft`
- `submitted`
- `paid`
- `invoiced`
- `queued_for_n8n`
- `n8n_sent`
- `n8n_confirmed`
- `n8n_failed`

The API persists a canonical order record before attempting any n8n handoff. Each outbound delivery attempt is logged with timestamps, attempt status, request metadata, response metadata, payload checksum, and confirmation state. Duplicate sends are blocked after n8n confirmation.

## n8n Integration

Configure n8n values either through the admin page or environment defaults:

- `N8N_ORDERS_WEBHOOK_URL`
- `N8N_CALLBACK_SECRET`
- `N8N_SHARED_SECRET`

The admin configuration is the preferred local testing path because it is persisted in PostgreSQL and read by the backend sender. Environment values act as fallback defaults.

See [docs/N8N_INTEGRATION.md](docs/N8N_INTEGRATION.md) for the webhook payload, callback contract, and recommended n8n workflow shape.

## Admin Configuration

The admin page manages:

- product sizes
- pricing tiers
- available plate colors
- n8n webhook URL
- n8n callback/shared secrets

The admin page no longer exposes a reset-to-defaults button because long-term deployments should treat product configuration as persistent data, not disposable seed state.

## Data Storage

Local persistence is handled by PostgreSQL. The current app stores:

- admin product and workflow configuration
- canonical orders
- order line-item/nameplate payload data
- order lifecycle state
- n8n delivery attempts and confirmation metadata

Do not move canonical order storage into n8n. n8n should receive already-finalized order payloads and perform external actions such as email, invoice, proof-package assembly, and order-intake notification.

## Testing

Relevant automated tests live under:

```text
artifacts/nameplates-express/src/lib/__tests__/
```

Important test coverage includes:

- admin configuration schema behavior
- order state transitions
- order workflow payload generation
- n8n confirmation handling
- retry/failure behavior
- add-to-cart guard behavior

Run tests from a prepared workspace:

```powershell
pnpm -C artifacts/nameplates-express test
```

## Repository Hygiene

- Keep `docker/.env.local` private and untracked.
- Commit only environment templates such as `docker/.env.local.example`.
- Do not commit API keys, webhook secrets, passwords, database dumps, dependency caches, or generated build output.
- Public GitHub is for source visibility and collaboration.
- Local Gitea is the isolated backup and issue tracker for deployment blockers.

## Documentation

- [docs/AUDIT_FINDINGS.md](docs/AUDIT_FINDINGS.md) - Current blocking issues and deployment readiness notes.
- [docs/N8N_INTEGRATION.md](docs/N8N_INTEGRATION.md) - n8n webhook setup and callback contract.
- [docs/DEPLOYMENT_NOTES.md](docs/DEPLOYMENT_NOTES.md) - Docker, GitHub, and local mirror deployment notes.
