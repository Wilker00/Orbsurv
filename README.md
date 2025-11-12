# Orbsurv Backend

FastAPI service backing Orbsurv's marketing site, user portal, and developer console. The service exposes async REST endpoints with PostgreSQL persistence, JWT auth, and Alembic migrations. Docker and CI wiring are included so the stack can reach production without additional scaffolding.

## Stack

- **Framework:** FastAPI on Uvicorn/Gunicorn
- **Data:** SQLAlchemy 2.x (async) with PostgreSQL (`asyncpg`) and Alembic migrations
- **Security:** Passlib bcrypt hashing, JWT access/refresh tokens, role-based guards
- **Caching / rate limits:** Redis-backed limiter with automatic in-memory fallback
- **Observability:** Optional Sentry instrumentation + structured client error ingestion
- **Tooling:** pytest + httpx for API tests, ruff/black/mypy for quality gates, pre-commit hooks

## Local development

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r backend/requirements.txt
cp backend/.env backend/.env.local  # customise secrets as needed
alembic upgrade head
uvicorn backend.app:app --reload --port 8000
```

The API lives at `http://127.0.0.1:8000`, with docs at `http://127.0.0.1:8000/api/v1/docs`. Static pages in `web/` expect the `/api/v1` prefix.

### Docker compose

```bash
docker compose up --build
# API available at http://localhost:8000/api/v1
```

Compose spins up:

- `db` — Postgres 15 seeded from `DATABASE_URL`
- `redis` — Redis 7 (reserved for token blacklists / rate limiting hooks)
- `api` — Gunicorn + Uvicorn workers running the FastAPI app

Run migrations inside the container with `docker compose exec api alembic upgrade head`.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | e.g. `postgresql+asyncpg://postgres:postgres@localhost:5432/orbsurv` |
| `JWT_SECRET_KEY` | Symmetric signing key for JWT tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | Refresh token lifetime in minutes |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed origins |
| `ENV` | `development` or `production` (controls logging noise) |
| `LOG_LEVEL` | Logging level (INFO, DEBUG, etc.) |
| `DEV_MASTER_OTP` | OTP required for dev logins (default `000000`) |
| `REDIS_URL` | Optional Redis connection string for rate limits / blacklists |
| `PUBLIC_FORM_RATE_LIMIT` / `PUBLIC_FORM_RATE_WINDOW_SECONDS` | Controls how many anonymous form submissions are accepted per IP per window |
| `CLIENT_ERROR_RATE_LIMIT` / `CLIENT_ERROR_RATE_WINDOW_SECONDS` | Throttle `/client_errors` volume from noisy browsers |
| `CAPTCHA_SECRET_KEY` | Secret key from your captcha provider (required in production) |
| `CAPTCHA_REQUIRED_FOR_PUBLIC_FORMS` | Set `true` to require captcha tokens on waitlist/contact/pilot/order forms |
| `SENTRY_DSN` | Sentry DSN for backend traces/errors |
| `SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_PROFILES_SAMPLE_RATE` | Sample rates (0-1) for tracing/profiling data |

### Captcha, rate limiting & observability
- Provide your captcha site key to the static site via `<meta name="orbsurv-captcha-provider">` + `<meta name="orbsurv-captcha-sitekey">` tags (or set `window.ORBSURV_CAPTCHA_PROVIDER/SITE_KEY` before loading `js/forms.js`) so the client can request tokens automatically.

- Public marketing forms (`/waitlist`, `/contact`, `/pilot_request`, `/investor_interest`, `/orders`) now pass through a shared guard that enforces Redis (or in-process) rate limiting and optional captcha verification. Configure `PUBLIC_FORM_RATE_*` to adjust throughput; in production the app requires `CAPTCHA_SECRET_KEY` and `CAPTCHA_REQUIRED_FOR_PUBLIC_FORMS=true`.
- Client-side error reports hitting `/client_errors` are throttled via `CLIENT_ERROR_RATE_*` and, when `SENTRY_DSN` is present, forwarded to Sentry with request metadata.
- Server-side Sentry instrumentation is wired into FastAPI, SQLAlchemy, and logging; set the DSN plus trace/profile sample rates to capture production telemetry.

## Routine commands

```bash
# Quality gates
ruff backend
black backend --check
mypy backend
pytest backend/tests

# Database migrations
alembic revision --autogenerate -m "describe change"
alembic upgrade head

# Pre-commit
pre-commit install
pre-commit run --all-files
```

## API highlights

- `POST /api/v1/auth/register` — create a user (role defaults to `user`)
- `POST /api/v1/auth/login` — issue access/refresh tokens (`scope="dev"` + OTP for dev role)
- `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
- `GET /api/v1/users/me` — current user profile
- `GET /api/v1/dashboard/summary` — dashboard metrics + recent audit events
- `PATCH /api/v1/account/*`, `PATCH /api/v1/settings/*` — user preferences
- Public forms: `/waitlist`, `/contact`, `/investor_interest`, `/pilot_request`
- Dev console: `/api/v1/admin/summary`, `/admin/logs`, `/admin/users`, `/admin/users/{id}`
- Health probes: `/api/v1/healthz`, `/api/v1/readyz`

The full contract (with schemas) is published at `/api/v1/docs`.

## Runbook snapshot

### Local
1. Install dependencies, apply migrations, and run `uvicorn backend.app:app --reload`.
2. Serve `web/` with any static server and ensure form submissions reach the API.

### Production
1. `docker compose build api` (or `docker build -t orbsurv-api backend/`).
2. `alembic upgrade head` against the production database.
3. Provide env secrets (`DATABASE_URL`, `JWT_SECRET_KEY`, allowed origins, OTP, etc.).
4. Run the container behind your ingress; keep `/api/v1/healthz` & `/api/v1/readyz` wired into monitoring.

### Troubleshooting
- 401 responses: ensure bearer token present and token version not bumped by logout/role update.
- 403 responses: dev routes require `role=dev` and matching OTP.
- DB errors: confirm `DATABASE_URL` uses the `+asyncpg` driver.
- Frontend issues: verify `/api/v1` prefix matches the deployed base URL.

## CI

`.github/workflows/ci.yml` installs backend deps, runs ruff/black/mypy, and executes pytest on every push and pull request. SQLite backs the test suite for isolation; Postgres usage is exercised via Alembic migrations and Docker.