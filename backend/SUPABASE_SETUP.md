# Supabase setup for TypeForge (persistent XP, sessions, badges)

Your dashboard stays empty and XP disappears after logout when the **API cannot write to Postgres**. The browser only caches data temporarily; the account lives in Supabase.

## 1. Run the schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste the full contents of `backend/schema.sql` and click **Run**.
3. Confirm tables exist: **Table Editor** → `users`, `sessions`, `achievements`, `typing_dna`.

## 2. Connection string for Render (API)

1. Supabase → **Project Settings** → **Database**.
2. Under **Connection string**, choose **URI** and mode **Session** (port **5432**), not Transaction pooler for this app.
3. Copy the URL (it looks like `postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:5432/postgres`).
4. On [Render](https://dashboard.render.com) → your TypeForge API service → **Environment**:
   - `DATABASE_URL` = that URI (password included)
   - `CLERK_SECRET_KEY` = from Clerk dashboard
   - `CLERK_JWT_KEY` or JWKS (optional if using JWKS fetch)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (optional, for future storage)

5. **Redeploy** the API after saving env vars.

## 3. Verify

```bash
curl https://typeforge-tkw8.onrender.com/health
```

Expect `"db_connected": true`. If `false`, `DATABASE_URL` is missing or wrong.

While signed in, open:

```text
https://typeforge.fun/api/v1/users/me
```

(With Clerk token from the app.) You should get JSON with `xp`, `level`, `total_sessions`.

## 4. How data flows

```mermaid
sequenceDiagram
  participant Browser
  participant Clerk
  participant Vercel
  participant Render
  participant Postgres

  Browser->>Clerk: Sign in
  Browser->>Vercel: POST /api/v1/sessions/ + JWT
  Vercel->>Render: Proxy
  Render->>Clerk: Verify JWT
  Render->>Postgres: INSERT session, UPDATE users.xp
  Postgres-->>Render: OK
  Render-->>Browser: xp_earned, badges_earned
```

- **users**: one row per Clerk user (`clerk_id`), stores `xp`, `level`, `total_sessions`, `best_wpm`.
- **sessions**: every completed typing test.
- **achievements**: unlocked `badge_id` per user (permanent).
- **typing_dna**: latest weak keys for dashboard targets.

## 5. Row Level Security

The API uses **direct Postgres** with `DATABASE_URL` (service role / DB user). RLS policies in `schema.sql` do not block the API. If you only use the API, you do not need to change RLS.

## 6. Local development

Create `backend/.env`:

```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
DEBUG=true
```

Run: `cd backend && uvicorn main:app --reload --port 8001`

Frontend on localhost uses `http://localhost:8001/api/v1` automatically.
