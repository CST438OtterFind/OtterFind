# Runbook

## Run the API locally

1. `cp .env.example .env`
2. Set `APP_JWT_SECRET_BASE64` in `.env`. Generate a value with `openssl rand -base64 32`.
3. `docker compose up --build`

Check it with `curl http://localhost:8080/actuator/health`. Compose always points the API at its own
Postgres container, even if `.env` holds other database values.

## First-time setup

Do these in order. Each step needs the one before it.

### 1. Supabase

Supabase hosts the database only. Nothing calls it except the API, over JDBC.

1. Open **Connect**, choose **Session pooler**, and copy the host. It can't be worked out from the region.
2. Note the values for step 3:
   - `DATABASE_URL`: `jdbc:postgresql://<pooler-host>:5432/postgres?sslmode=require`
   - `DATABASE_USER`: `postgres.<project-ref>`
   - `DATABASE_PASSWORD`: the database password
3. Under **Integrations > Data API**, turn off **Enable Data API**. Nothing uses it, and it's a route into
   the tables that skips the API's checks.

Use the session pooler. Render has no outbound IPv6, and Supabase's direct connection is IPv6-only on the free plan.

### 2. Publish the first image

1. Once `.github/workflows/release.yml` is on `main`, the sprint's captain (see `docs/captains.md`) pushes the
   first version tag: `git tag v0.1.0 && git push origin v0.1.0`. The workflow builds the image from
   `api/Dockerfile` and pushes it to GHCR. Its Render step is skipped for now because the hook doesn't exist yet.
2. In the org's **Packages**, open `otterfind-api`, then **Package settings > Change visibility > Public**.
   New packages start private even from a public repo, and Render pulls without credentials. This can't be
   undone, which is fine because the image only holds code that's already public. If GitHub won't allow it,
   check the org's package creation settings.

To publish by hand instead, such as to try Render before the first release, sign in with a personal access
token that has `write:packages`:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
docker build --platform linux/amd64 -t ghcr.io/cst438otterfind/otterfind-api:latest ./api
docker push ghcr.io/cst438otterfind/otterfind-api:latest
```

### 3. Render

In the dashboard, choose **New > Blueprint** and select this repo. Render reads `render.yaml` from the repo root.

The service runs a prebuilt image, so it has no root directory, Dockerfile path or build command. Leave
**Docker Command** blank so the image's own `ENTRYPOINT` starts the API. It needs no pre-deploy command either:
Flyway applies migrations when the API starts.

Render asks for these values once, when the Blueprint is created. Add any variable introduced later in the
service's **Environment** page, because later Blueprint syncs ignore `sync: false` variables.

| Variable | Value |
|---|---|
| `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` | From step 1 |
| `APP_JWT_SECRET_BASE64` | A new `openssl rand -base64 32`, not your local one |
| `APP_JWT_ISSUER` | The service's URL, such as `https://otterfind-api.onrender.com` |
| `APP_CORS_ORIGINS` | The web client's URL. Until that exists, browsers are refused, but the API still runs |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The GitHub OAuth app |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET` | The Google OAuth client |
| `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | The R2 bucket |

### 4. Deploy hook

Copy the **Deploy Hook** URL from the service's **Settings** page and save it as a GitHub Actions repository
secret named `RENDER_DEPLOY_HOOK_URL`. Treat it like a password: anyone who has it can trigger a deploy.

## Release

Push a version tag. `release.yml` publishes the image as both that tag and `latest`, then asks Render to deploy
that tag. Render never redeploys on its own when an image changes.

## Free plan limits

- **Render:** the service sleeps after 15 minutes without traffic. Waking it took about 3 minutes in a local test
  capped at the same 0.1 CPU and 512 MB, so open it well before a demo or a timed check.
- **Supabase:** projects pause after a week of inactivity. Restore a paused project from the dashboard. If the
  API suddenly can't reach the database, check this first.
