# GearGuard — The Ultimate Maintenance Tracker

Track equipment, manage teams, and streamline maintenance requests.  
Live: **https://oddo-x-adani-hackaton.vercel.app**

---

## Push to GitHub (one-time or updates)

**Option A — Double-click (Windows)**  
Run **`push-to-github.bat`** in this folder.  
*(Requires [Git for Windows](https://git-scm.com/download/win) installed.)*

**Option B — Terminal**
```bash
cd "D:\oddo-X-Adani-hackaton---first-round---gearguard---main"
git init
git remote add origin https://github.com/rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--.git
git add .
git commit -m "Vercel-ready: serverless backend, DATABASE_URL, CORS, production base URL"
git branch -M main
git push -u origin main
```

If the repo already exists and you get conflicts:  
`git pull origin main --rebase` then `git push -u origin main`.

---

## Deploy on Vercel (make it workable)

1. **Import project**  
   Go to [vercel.com/new](https://vercel.com/new) → Import **rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--**.

2. **Add database**  
   In the project: **Settings → Environment Variables** → add:
   - **Name:** `DATABASE_URL`
   - **Value:** your Postgres connection string  
   (e.g. from [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com)).

3. **Deploy**  
   Click **Deploy** (or push to `main` to auto-deploy).

4. **Create tables**  
   In your Postgres database, run the SQL in:
   - `database/schema.sql` (required)
   - `database/mockdata.sql` (optional sample data)

After that, the app and API at **https://oddo-x-adani-hackaton.vercel.app** are fully workable.

---

## Project structure

| Path            | Purpose                    |
|-----------------|----------------------------|
| `index.html`    | Landing page               |
| `login.html`    | Login / Register           |
| `dashboard.html`| Dashboard                  |
| `equipment.html`| Equipment                  |
| `requests.html` | Requests (Kanban)          |
| `teams.html`    | Teams                      |
| `calendar.html` | Calendar                   |
| `frontend/`     | CSS & JS                   |
| `backend/`      | Node/Express API           |
| `database/`     | Schema & mock data         |
| `vercel.json`   | Vercel routes & builds     |

---

## Local development

```bash
# Backend (API)
cd backend && npm install && npm run dev

# Frontend: open index.html in a browser or use a static server
# Ensure API runs on same origin or set CORS for your dev URL
```

For local DB, copy `env.example` to `backend/.env` and set `DB_*` or `DATABASE_URL`.
