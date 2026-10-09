# Phase 6 -- Deployment Readiness Report

**Run date:** 2026-04-16
**Target:** Render (3-service: frontend, backend API, managed Postgres)
**Executed by:** Claude Opus 4.6 (automated checks with live command execution)

---

## 1. Docker Build -- Backend

**Command:** `docker build -t dhanvantari-api-test ./backend`
**Base image:** `python:3.13-slim`

**Status: IN PROGRESS (context transfer stalled)**

The build began successfully -- base image pulled, `apt-get` installed `gcc` and `libpq-dev` (step completed in 29.8s) -- but then stalled on "load build context" for >5 minutes. Root cause: **no `.dockerignore` file exists** in `backend/`. The entire 130 MB directory (including `__pycache__/`, `.ruff_cache/`, `.pytest_cache/`, `uploads/`, local venv artifacts) is being sent to the Docker daemon.

**Dockerfile review findings:**
- Single-stage build (not multi-stage) -- `python:3.13-slim` is reasonable
- `CMD` runs `alembic upgrade head && uvicorn ...` -- good, migrations run at container start
- Uses `${PORT:-8747}` for port -- compatible with Render's `PORT` injection
- No `EXPOSE` directive (cosmetic, not blocking)
- No non-root `USER` directive -- runs as root inside container
- No `.dockerignore` -- **BLOCKER for build performance**

**Required fix -- create `backend/.dockerignore`:**
```
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
uploads/
*.egg-info/
.env
venv/
.venv/
```

### Estimated image size
Based on `python:3.13-slim` (~150MB) + gcc/libpq-dev (~120MB) + pip packages (~80MB) + app code (~2MB): **~350 MB estimated**. Note: gcc is only needed at build time; a multi-stage build could reduce final image to ~230 MB.

---

## 2. Docker Build -- Frontend

**Command:** `docker build -t dhanvantari-frontend-test --build-arg NEXT_PUBLIC_API_URL=http://localhost:8747 ./frontend`
**Base image:** `node:20-alpine` (multi-stage)

**Status: IN PROGRESS (context transfer stalled at 67.45 MB)**

Same root cause: **no `frontend/.dockerignore`** -- the entire `node_modules/` directory is being sent to the Docker daemon, despite `npm ci` reinstalling everything inside the container.

**Dockerfile review findings (positive):**
- Proper multi-stage build: `builder` stage for `npm ci` + `npm run build`, `runner` stage with standalone output only
- `NEXT_PUBLIC_API_URL` hardcoded in Dockerfile ENV as fallback (`https://dhanvantari-api.onrender.com`) -- the `--build-arg` in render.yaml is not used since the ENV is baked in. This is actually correct for Next.js (NEXT_PUBLIC_ vars must be present at build time)
- Standalone output (`next.config.ts` has `output: "standalone"`) -- minimal production image
- Listens on port 10000 -- Render's default for Docker services
- Uses `HOSTNAME="0.0.0.0"` -- correct for container networking

**Required fix -- create `frontend/.dockerignore`:**
```
node_modules/
.next/
out/
.env.local
```

### Estimated image size
`node:20-alpine` (~180MB) + standalone Next.js output (~30-50MB): **~220 MB estimated**.

---

## 3. render.yaml Validation

**File:** `render.yaml` (root of repo)

| Check | Status | Detail |
|-------|--------|--------|
| Database defined | PASS | `dhanvantari-db`, plan: free, user: dhanvantari |
| Backend service type | PASS | `type: web`, `runtime: docker` |
| Backend dockerfilePath | PASS | `./backend/Dockerfile` |
| Backend dockerContext | PASS | `./backend` |
| Frontend service type | PASS | `type: web`, `runtime: docker` |
| Frontend dockerfilePath | PASS | `./frontend/Dockerfile` |
| Frontend dockerContext | PASS | `./frontend` |
| DATABASE_URL from DB | PASS | `fromDatabase.connectionString` with correct DB name |
| SECRET_KEY auto-generated | PASS | `generateValue: true` |
| DEBUG=false | PASS | Hardcoded `"false"` |
| FRONTEND_URL set | PASS | `https://dhanvantari.onrender.com` |
| NEXT_PUBLIC_API_URL set | PASS | `https://dhanvantari-api.onrender.com` |
| Health check path | PASS | `/api/health` -- matches `@app.get("/api/health")` in main.py |
| Optional secrets (Stripe) | PASS | `sync: false` -- manual entry in Render dashboard |
| Optional secrets (Resend) | PASS | `sync: false` |
| Optional secrets (Anthropic) | PASS | `sync: false` |

**Observations:**
- No `region` specified -- will use Render's default (Oregon). Consider setting explicitly if users are geo-concentrated.
- No `numInstances` -- defaults to 1. Acceptable for free tier.
- No `preDeployCommand` -- migrations are handled in Dockerfile CMD, which is fine.
- Render's managed Postgres `connectionString` uses `postgres://` prefix. The codebase correctly handles this conversion to `postgresql+asyncpg://` in `database.py`, `alembic/env.py`, and seed scripts.

---

## 4. Alembic Migration Check

**Command:** `alembic upgrade head`
**Database:** `postgresql://postgres:postgres@localhost:5432/dhanvantari` (Docker Compose Postgres, healthy)

### Result: FAILED -- BLOCKER

```
UserWarning: Revision 0009 is present more than once
ERROR: Multiple head revisions are present for given argument 'head';
       please specify a specific target revision, '<branchname>@head'
       to narrow to a specific head, or 'heads' for all heads
FAILED: Multiple head revisions are present for given argument 'head'
```

**Root cause:** Two migration files both declare `revision = "0009"` and `down_revision = "0008"`:
- `alembic/versions/0009_patient_intake_forms.py` -- creates `intake_tokens`, `intake_submissions`
- `alembic/versions/0009_service_packages.py` -- creates `therapies`, `service_packages`, `package_therapies`, `plan_therapies`, `plan_service_packages`

This creates a "branch" in the migration DAG with two heads, so `alembic upgrade head` fails.

**Impact:** The backend Dockerfile CMD (`alembic upgrade head && uvicorn ...`) will **fail on every deploy**, preventing the container from starting.

**Fix required:**
1. Rename `0009_service_packages.py` to `0010_service_packages.py`
2. Change its `revision = "0010"` and `down_revision = "0009"`
3. Verify the linear chain: `0008 -> 0009 (intake) -> 0010 (therapies)`
4. Test `alembic upgrade head` and `alembic downgrade base && alembic upgrade head`

**Idempotency test:** Could not be performed due to the above blocker.

### Migration chain (current, broken):
```
0001 -> 0002 -> 0003 -> 0004 -> 0005 -> 0006 -> 0007 -> 0008
                                                            |-> 0009 (intake_forms)
                                                            |-> 0009 (service_packages)
```

### Migration chain (required fix):
```
0001 -> 0002 -> 0003 -> 0004 -> 0005 -> 0006 -> 0007 -> 0008 -> 0009 -> 0010
```

---

## 5. Health Endpoint Test

**Method:** ASGI transport test (httpx AsyncClient with ASGITransport, no server startup needed)

```
Status: 200
Body: {"status":"ok","version":"1.0.0"}
```

**Result: PASS**

The `/api/health` endpoint defined at `main.py:106-108` returns the expected JSON. This matches the `healthCheckPath: /api/health` in render.yaml. Render will use this for container health monitoring.

---

## 6. CORS Configuration Check

**File:** `backend/app/main.py:66-77`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,               # https://dhanvantari.onrender.com (from render.yaml)
        "https://dhanvantari.patriottechsystems.com",  # Custom domain
        "http://localhost:3000",              # Dev
        "http://localhost:3747",              # Dev (docker-compose)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Findings:

| Origin | Environment | Status |
|--------|-------------|--------|
| `settings.FRONTEND_URL` | Production (from env var) | PASS |
| `https://dhanvantari.patriottechsystems.com` | Custom domain | PASS |
| `http://localhost:3000` | Development only | **HIGH RISK** |
| `http://localhost:3747` | Development only | **HIGH RISK** |

**Issue:** Localhost origins are hardcoded and will be active in production. This allows any application running on a user's localhost:3000 or localhost:3747 to make credentialed cross-origin requests to the production API.

**Fix:** Gate localhost origins behind the DEBUG flag:
```python
origins = [
    settings.FRONTEND_URL,
    "https://dhanvantari.patriottechsystems.com",
]
if settings.DEBUG:
    origins += ["http://localhost:3000", "http://localhost:3747"]

app.add_middleware(CORSMiddleware, allow_origins=origins, ...)
```

**Additional note:** `allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive. Consider restricting to actual methods used (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and specific headers (`Authorization`, `Content-Type`).

---

## 7. Demo User in Production -- SECURITY RISK

**File:** `backend/app/main.py:19-50`

The `_ensure_demo_user()` function runs unconditionally on every application startup via the `lifespan` context manager:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _ensure_demo_user()          # <-- ALWAYS runs
    yield
```

**Hardcoded credentials:**
- Email: `demo@dhanvantari.app`
- Password: `demo1234`
- Tier: `PRACTICE` (full access)
- Trial: 365 days from startup

**Risk assessment: BLOCKER**

This creates a known backdoor account in production with a guessable email and trivial password. Any attacker can log in as a practitioner with full PRACTICE-tier access, view/modify patient data, and access all platform features.

**Fix required:**
```python
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if settings.DEBUG:
        await _ensure_demo_user()
    yield
```

**Additional concern:** `Base.metadata.create_all` also runs on every startup. While harmless (it's a no-op if tables exist), production should rely solely on Alembic migrations, which the Dockerfile CMD already handles. Consider removing `create_all` from the lifespan entirely for production.

---

## 8. Environment Variable Audit

**Cross-reference:** `render.yaml` envVars vs `backend/app/core/config.py` Settings class.

| Variable | config.py Default | render.yaml | Status | Notes |
|----------|------------------|-------------|--------|-------|
| `DATABASE_URL` | `postgresql://...localhost...` | `fromDatabase` | PASS | Render overrides default |
| `SECRET_KEY` | `"change-me-in-production..."` | `generateValue: true` | PASS | Auto-generated |
| `DEBUG` | `True` | `"false"` | PASS | Correctly disabled |
| `FRONTEND_URL` | `http://localhost:3747` | `https://dhanvantari.onrender.com` | PASS | |
| `STRIPE_SECRET_KEY` | `""` | `sync: false` | PASS | Optional, manual |
| `STRIPE_WEBHOOK_SECRET` | `""` | `sync: false` | PASS | Optional, manual |
| `STRIPE_PRICE_SEED` | `""` | `sync: false` | PASS | Optional, manual |
| `STRIPE_PRICE_PRACTICE` | `""` | `sync: false` | PASS | Optional, manual |
| `STRIPE_PRICE_CLINIC` | `""` | `sync: false` | PASS | Optional, manual |
| `RESEND_API_KEY` | `""` | `sync: false` | PASS | Optional, manual |
| `ANTHROPIC_API_KEY` | `""` | `sync: false` | PASS | Optional, manual |
| `APP_NAME` | `"Dhanvantari..."` | Not set | OK | Default is correct |
| `APP_VERSION` | `"1.0.0"` | Not set | OK | Default is correct |
| `ALGORITHM` | `"HS256"` | Not set | OK | Default is correct |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Not set | WARN | Long token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Not set | OK | |
| `EMAIL_FROM` | `noreply@dhanvantari.app` | Not set | OK | Default is correct |
| `EMAIL_FROM_NAME` | `Dhanvantari Care` | Not set | OK | Default is correct |
| `AI_MODEL` | `claude-sonnet-5-5` | Not set | OK | Default is correct |
| `STORAGE_BACKEND` | `"local"` | Not set | WARN | See ephemeral storage issue |
| `STORAGE_LOCAL_PATH` | `"./uploads"` | Not set | WARN | Ephemeral on Render |
| `AWS_BUCKET` | `""` | Not set | N/A | Not used until S3 switch |
| `AWS_REGION` | `"us-east-1"` | Not set | N/A | Not used until S3 switch |

### Missing from render.yaml (non-blocking):
- `STORAGE_BACKEND` / `AWS_BUCKET` / `AWS_REGION` -- not needed until S3 migration
- `EMAIL_FROM` / `EMAIL_FROM_NAME` -- defaults are production-appropriate

### Warnings:
- **Access token lifetime of 7 days** is long. Consider reducing to 1-4 hours with refresh token rotation for production.
- **No `SENTRY_DSN` or error tracking** configured. Consider adding for production observability.

---

## Summary of Findings

### Blockers (must fix before deploy)

| # | Issue | File | Severity |
|---|-------|------|----------|
| B1 | Duplicate Alembic migration revision 0009 causes `alembic upgrade head` to fail. Backend container will crash on startup. | `alembic/versions/0009_*.py` | **BLOCKER** |
| B2 | `_ensure_demo_user()` creates a backdoor account (`demo@dhanvantari.app` / `demo1234`) on every production startup. | `app/main.py:19-50` | **BLOCKER** |
| B3 | No `.dockerignore` in `backend/` or `frontend/`. Build context is 130MB+ and 67MB+ respectively, causing extremely slow builds and bloated images. | Missing files | **BLOCKER** |

### High Priority

| # | Issue | File | Severity |
|---|-------|------|----------|
| H1 | CORS allows `http://localhost:3000` and `http://localhost:3747` in production. | `app/main.py:71-72` | **HIGH** |
| H2 | Backend Dockerfile runs as root. Should add non-root USER. | `backend/Dockerfile` | **HIGH** |

### Medium Priority

| # | Issue | File | Severity |
|---|-------|------|----------|
| M1 | Ephemeral file storage: uploaded images lost on redeploy. Config supports S3 but not wired up. | `app/core/config.py:43-44` | **MEDIUM** |
| M2 | `Base.metadata.create_all` runs on every startup alongside Alembic. Remove for production to avoid schema drift. | `app/main.py:48-49` | **MEDIUM** |
| M3 | Render free tier cold starts (15-30s after 15min inactivity). | render.yaml `plan: free` | **MEDIUM** |
| M4 | Access token expires in 7 days -- unusually long for a medical platform. | `app/core/config.py:23` | **MEDIUM** |
| M5 | SQL echo enabled when DEBUG=True (`echo=settings.DEBUG`) -- verify DEBUG=false takes effect on Render. | `app/core/database.py:17` | **MEDIUM** |
| M6 | Backend Dockerfile does not use multi-stage build. gcc/libpq-dev remain in final image. | `backend/Dockerfile` | **MEDIUM** |

### Low Priority

| # | Issue | File | Severity |
|---|-------|------|----------|
| L1 | docker-compose.yml uses deprecated `version` key. | `docker-compose.yml:1` | **LOW** |
| L2 | No `EXPOSE` in backend Dockerfile (cosmetic). | `backend/Dockerfile` | **LOW** |
| L3 | No error tracking (Sentry/etc) configured. | N/A | **LOW** |

---

## Deployment Checklist

- [x] render.yaml is valid and complete
- [x] All required env vars provided or auto-generated
- [x] Health check endpoint exists and returns `{"status":"ok","version":"1.0.0"}`
- [x] `DEBUG=false` in production config
- [x] `SECRET_KEY` auto-generated (not hardcoded)
- [x] Render DB connection string format handled (`postgres://` -> `postgresql+asyncpg://`)
- [x] Frontend Dockerfile uses multi-stage build with standalone output
- [ ] **BLOCKER B1:** Fix duplicate migration revision 0009
- [ ] **BLOCKER B2:** Gate `_ensure_demo_user()` behind `if settings.DEBUG`
- [ ] **BLOCKER B3:** Add `.dockerignore` to `backend/` and `frontend/`
- [ ] **HIGH H1:** Remove localhost from CORS in production
- [ ] **HIGH H2:** Add non-root USER to backend Dockerfile
- [ ] Docker builds verified end-to-end (blocked by B3)
- [ ] Alembic full cycle tested: `upgrade head` + `downgrade base` + `upgrade head` (blocked by B1)
- [ ] File upload persistence addressed (S3/R2)

---

## Verdict

The Render configuration (`render.yaml`) is well-structured with proper env var management, database linking, and health checks. However, **three blockers prevent deployment:**

1. The duplicate Alembic migration `0009` will crash the backend container on every startup attempt.
2. The unconditional demo user creation is a security vulnerability.
3. Missing `.dockerignore` files cause unacceptably slow builds (observed: >5 minutes for context transfer alone on local machine; will be similarly slow on Render's build infrastructure).

After fixing these three items, the platform can be deployed to Render with the understanding that file uploads will be ephemeral and the free tier will have cold-start latency.
