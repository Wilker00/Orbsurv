# Orbsurv Backend

This directory contains a lightweight Python HTTP backend that accepts form submissions from the prototype pages under `site/`.

## Requirements

- Python 3.9 or newer (standard library only; no extra packages required).

## Running the server

```powershell
cd backend
python server.py
```

Environment variables:

- `ORBSURV_HOST` (default `127.0.0.1`) - bind address
- `ORBSURV_PORT` (default `8000`) - listening port
- `ORBSURV_ALLOWED_ORIGIN` (default `*`) - value for the CORS `Access-Control-Allow-Origin` header
- `ORBSURV_DATA_DIR` (default `<repo>/backend/data`) - location for the JSON data files that persist submissions

The server writes JSON arrays to the `data/` folder (`early_interest.json`, `pilot_signups.json`, `waitlist.json`, `contact_messages.json`, `users.json`).

Stop the server with `Ctrl+C`.

## API

All endpoints expect and return JSON. Successful POST responses use HTTP 201 unless noted.

| Endpoint | Payload | Description |
| --- | --- | --- |
| `POST /api/interest` | `{ "email": "user@example.com" }` | Subscribe to the early-interest list |
| `POST /api/pilot` | `{ "email": "user@example.com" }` | Join the pilot waitlist |
| `POST /api/waitlist` | `{ "email": "user@example.com" }` | Product page waitlist capture |
| `POST /api/contact` | `{ "name": "Ada", "email": "user@example.com", "message": "..." }` | Contact form submission |
| `POST /api/auth/register` | `{ "email": "user@example.com", "password": "secret123", "name": "Ada" }` | Create an account (password >= 8 chars, email unique) |
| `POST /api/auth/login` | `{ "email": "user@example.com", "password": "secret123" }` | Authenticate an existing account (returns HTTP 200) |
| `GET /health` | - | Simple health/status check |

Error responses return `{ "error": "message" }` with the appropriate HTTP status code (400 for validation issues, 404 for unknown routes).

## Frontend integration

The pages in `site/index.html`, `site/about.html`, `site/product.html`, `site/signup.html`, and `site/login.html` now submit their forms via `fetch` to the backend. They look for the backend at `http://127.0.0.1:8000` unless `window.ORBSURV_API_BASE` is defined earlier on the page.

If you want to preview the pages locally, serve the `site/` directory (for example with `python -m http.server 3000` inside `site/`) while the backend runs on port 8000.

For a post-login view, open `site/admin.html` (the login page now redirects there) to review dashboard placeholders for upcoming analytics.

## Admin CLI

Use `python admin.py` to inspect or export submissions that the backend stored on disk. The CLI respects the same environment variables as the server (including `ORBSURV_DATA_DIR`).

Common tasks:

- `python admin.py list` - dump every dataset to stdout
- `python admin.py list interest --limit 5 --pretty` - show the five most recent early-interest records with indentation
- `python admin.py list users --limit 5 --pretty` - inspect recent registrations (password hashes stay hidden)
- `python admin.py export waitlist exports/waitlist.csv --format csv` - create a CSV export of the product waitlist

Datasets are named `interest`, `pilot`, `waitlist`, `contact`, and `users`.

## Deployment considerations

When you want to move beyond local prototypes:

- **Allowed origins:** set `ORBSURV_ALLOWED_ORIGIN` (or replace the CORS logic) so only your production domains can call the API.
- **Storage durability:** the JSON files are fine for prototyping. For production use, switch `JsonStore` to a database-backed implementation (SQLite for a single host, or Postgres/MySQL for a multi-instance deployment).
- **Data retention:** add rotation or archival routines so the data directory does not grow without bound.
- **Process management:** run the server with a supervisor such as systemd, supervisord, or a container orchestrator. You can front it with nginx/Caddy to terminate TLS and serve the static pages.
- **Configuration:** keep secrets (SMTP credentials, API keys) in environment variables or a secrets manager; avoid hardcoding them into the repo.
- **Observability:** enable `ORBSURV_VERBOSE=1` for ad-hoc debugging and plan for structured logging/monitoring once you deploy.
