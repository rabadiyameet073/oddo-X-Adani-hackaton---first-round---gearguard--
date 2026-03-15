# Vercel checklist – make the deployed page workable

Code is pushed to: **https://github.com/rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--**

## 1. Connect (or reconnect) the repo on Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)** or your dashboard.
2. **Import** the repo: `rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--`.
3. Leave **Root Directory** as `.` (root).
4. Do **not** change Framework Preset; `vercel.json` defines the build.

## 2. Add database (required for login, equipment, requests, etc.)

1. In the project: **Settings → Environment Variables**.
2. Add:
   - **Name:** `DATABASE_URL`
   - **Value:** your Postgres connection string  
     Examples:
   - **Vercel Postgres:** Create a store in [Vercel Dashboard → Storage → Postgres](https://vercel.com/docs/storage/vercel-postgres), then copy the `.env.local` connection string into `DATABASE_URL`.
   - **Neon:** [neon.tech](https://neon.tech) → create project → connection string.
   - **Supabase:** Project Settings → Database → connection string (URI).
3. Apply to **Production** (and **Preview** if you use preview deployments).

## 3. Deploy

- If you just imported: click **Deploy**.
- If the project was already connected: the latest push to `main` should trigger a new deployment. Or go to **Deployments** and redeploy the latest.

## 4. Create tables in your database

In your Postgres database (same one as `DATABASE_URL`):

1. Run **`database/schema.sql`** (creates tables).
2. Optionally run **`database/mockdata.sql`** (sample users, equipment, etc.).

Use the SQL editor in Vercel Postgres / Neon / Supabase, or any Postgres client.

## 5. Test the deployed page

- **App:** `https://<your-project>.vercel.app` or your custom domain (e.g. `oddo-x-adani-hackaton.vercel.app`).
- **API health:** `https://<your-project>.vercel.app/api/health` → should return `{"status":"ok",...}`.
- **Login:** Use an user from `mockdata.sql` (e.g. `alice@gearguard.com` / password from the script) or register a new one.

After steps 1–4, the Vercel deployed page is workable (login, dashboard, equipment, requests, teams, calendar).
