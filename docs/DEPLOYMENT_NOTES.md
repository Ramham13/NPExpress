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

1. Resolve the blocking items in [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md).
2. Replace local development credentials with deployment-specific secrets.
3. Ensure admin secrets are masked or write-only in API responses.
4. Require authorization for sensitive order APIs.
5. Validate database backups and restore behavior.
6. Confirm n8n webhook timeout, retry, idempotency, and callback behavior.
7. Run automated tests from a clean install.
8. Run a complete PayPal and quote-request workflow.
9. Verify generated customer and intake emails in the target email environment.
10. Capture the final deployment runbook once production hosting details are selected.
