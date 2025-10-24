# Orbsurv Backend

FastAPI service backing Orbsurv's marketing site, user portal, and developer console. The service exposes async REST endpoints with PostgreSQL persistence, JWT auth, and Alembic migrations. Docker and CI wiring are included so the stack can reach production without additional scaffolding.

## Stack

- **Framework:** FastAPI on Uvicorn/Gunicorn
- **Data:** SQLAlchemy 2.x (async) with PostgreSQL (`asyncpg`) and Alembic migrations
- **Security:** Passlib bcrypt hashing, JWT access/refresh tokens, role-based guards
- **Caching / future rate limits:** Redis (optional today, baked into docker-compose)
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
