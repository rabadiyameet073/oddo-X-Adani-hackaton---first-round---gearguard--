# Push to GitHub & Deploy on Vercel

## 1. Push changes to GitHub

Open **Command Prompt** or **Git Bash** (where `git` is installed) in this folder and run:

```bash
cd "D:\oddo-X-Adani-hackaton---first-round---gearguard---main"

# If this folder is not yet a git repo:
git init

# Add the remote (use your repo URL)
git remote add origin https://github.com/rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--.git

# If the folder was already cloned and you only need to update remote:
# git remote set-url origin https://github.com/rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--.git

# Stage all files
git add .

# Commit
git commit -m "Vercel-ready: serverless backend, DATABASE_URL, CORS, production base URL"

# Push (use main or master depending on your default branch)
git push -u origin main
```

If the repo already has commits and you get "failed to push (non-fast-forward)", either:

- **Overwrite remote** (only if you are sure no one else depends on it):  
  `git push -u origin main --force`
- Or **pull first**:  
  `git pull origin main --rebase`  
  then  
  `git push -u origin main`

---

## 2. Make it work on Vercel

### Connect the repo

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New Project** → **Import** your repo:  
   `rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--`
3. Leave **Root Directory** as `.` (root).
4. **Environment Variables** (required for the API to work):
   - Add **`DATABASE_URL`** with your Postgres connection string, e.g.  
     - From [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (recommended), or  
     - From [Neon](https://neon.tech), [Supabase](https://supabase.com), or any Postgres host.  
   - Example:  
     `postgresql://user:password@host:5432/gearguard?sslmode=require`
5. Click **Deploy**.

### After first deploy

- Your app will be at:  
  `https://oddo-x-adani-hackaton---first-round---gearguard--<team>.vercel.app`  
  or the custom domain you set (e.g. `oddo-x-adani-hackaton.vercel.app`).
- **API**: `/api/health` should return `{"status":"ok",...}`.
- **Database**: Run the SQL in `database/schema.sql` and optionally `database/mockdata.sql` on your Postgres instance so the app has tables and sample data.

### If the API fails

- In Vercel: **Project → Settings → Environment Variables** and confirm `DATABASE_URL` is set for **Production** (and Preview if you use previews).
- Check **Deployments → [latest] → Functions** for runtime errors.
- Ensure your Postgres allows connections from the internet (and uses SSL if required).

---

## Summary

| Step              | Action |
|-------------------|--------|
| Push code         | Use the `git` commands above in a terminal where `git` is installed. |
| Vercel            | Import repo, add `DATABASE_URL`, deploy. |
| Database          | Create DB and run `database/schema.sql` (+ optional `mockdata.sql`). |
