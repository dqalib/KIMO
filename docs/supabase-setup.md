# Cloud sync setup (Supabase) — one-off, ~10 minutes

Without this, KIMO still works — progress just stays on one iPad.

## 1. Create the project
1. Go to supabase.com → sign in with GitHub → **New project**.
2. Name: `kimo`. Region: **West EU (London)**. Set a database password (save it in your password manager — the app never uses it).
3. Wait ~2 minutes for it to start.

## 2. Create the table
1. Left menu → **SQL Editor** → **New query**.
2. Paste everything from `supabase/schema.sql` → **Run**. You should see "Success. No rows returned".

## 3. Create the parent login (just one)
1. Left menu → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: your email. Password: a strong one. Tick **Auto Confirm User**.
3. **Authentication** → **Sign In / Providers** (or Settings) → turn **off** "Allow new users to sign up". Now nobody else can create an account.

## 4. Connect Vercel
1. Supabase → **Project Settings** → **API** (or the **Connect** button). Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (starts `sb_publishable_`) — or the legacy `anon` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. Vercel → KIMO project → **Settings** → **Environment Variables** → add both → Save.
3. Vercel → **Deployments** → latest → **⋯** → **Redeploy**.

Never use the `service_role` / secret key anywhere in the app.

## 5. On each iPad
- **iPad already in use:** Grown-ups → PIN → **Cloud sync** box → sign in. Existing progress uploads.
- **New iPad:** on the welcome screen tap **Already using KIMO on another device? Sign in**. The family, PIN and progress download.

## How it behaves
- Works offline; syncs a couple of seconds after each set, when the app is reopened, and every 5 minutes.
- If two iPads are used at once, both sets of practice are kept; for each child's current level, the most recent change wins.
- Removing a child on one iPad removes them everywhere.
