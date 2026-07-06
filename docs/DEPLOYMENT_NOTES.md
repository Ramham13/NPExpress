# Deployment Notes

These notes cover the current local Docker deployment, the public GitHub mirror, and the isolated local Gitea backup.

## Local Docker

The local test deployment runs from the repository root:

```powershell
docker compose up -d --build
```

Default local URLs:

- App: `http://127.0.0.1:8090/`
- Admin: `http://127.0.0.1:8090/admin`
- Health: `http://127.0.0.1:8090/api/health`

Use `docker/.env.local.example` as the template for the private local environment file:

```powershell
Copy-Item docker/.env.local.example docker/.env.local
```

`docker/.env.local` is intentionally ignored by git.

## Public GitHub Mirror

Public remote:

```text
https://github.com/Ramham13/NPExpress.git
```

Recommended push flow:

```powershell
git status --short
git remote -v
git push github main
```

Before pushing publicly:

- Confirm `git status --short` contains only intended changes.
- Confirm `git ls-files docker/.env.local` returns nothing.
- Search for secrets, local passwords, private URLs, and tokens.
- Avoid publishing local Gitea credentials or machine-specific secrets.

## Local Gitea Mirror

The local Gitea repository is an isolated backup and issue tracker. It should not be treated as the public source of truth. Blocking deployment issues should be published there so the backlog remains attached to the local code mirror.

Do not document or commit local Gitea credentials.

## Production Checklist

Before deploying beyond local testing:

1. Replace local development credentials with deployment-specific secrets and live infrastructure values.
2. Upgrade the local non-Docker Node.js runtime if this machine will be used for direct shell builds instead of Docker-only validation.
3. Validate database backups and restore behavior.
4. Confirm n8n webhook timeout, retry, idempotency, and callback behavior against the real target workflow.
5. Run automated tests from a clean install.
6. Run a complete PayPal sandbox and quote-request workflow.
7. Verify generated customer and intake emails in the target email environment.
8. If moving beyond sandbox, switch to live PayPal credentials and perform a fresh live-payment verification pass.
9. Capture the final deployment runbook once production hosting details are selected.
