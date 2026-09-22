# SplitBrief

Practice client conversations for graphic design work. Every project gives you two
chats side by side: an AI playing a business client (with a distinct, sometimes
difficult personality), and an AI senior designer mentor you can go to for
feedback and advice. You can send images of your work to either one — they can
look at and critique images, but never generate or edit them.

Training tool only. Bring your own Anthropic or OpenAI API key.

## One-time setup (do this before running the app)

You'll need three free accounts: **Supabase** (database, login, image storage),
**Vercel** (hosting), and you already have **GitHub** (code).

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project.
2. Once it's created, open **Project Settings -> Data API**. You'll need two
   values from this page in step 3 below: the **Project URL** and the
   **anon public** key.
3. Open the **SQL Editor** (left sidebar), click **New query**, paste in the
   entire contents of [`supabase/schema.sql`](supabase/schema.sql) from this
   repo, and click **Run**. This creates all the tables and security rules the
   app needs.
4. By default Supabase requires users to confirm their email before logging in.
   That's fine to leave on — when you sign up in the app, check your inbox for
   the confirmation link.

### 2. Set up your local environment file

1. Copy `.env.example` to a new file named `.env.local` in the project root.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Supabase step 1 above.
3. Generate a random encryption secret by running this in a terminal in this
   folder, and paste the output into `API_KEY_ENCRYPTION_SECRET`:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   This is used to encrypt your Anthropic/OpenAI API key before it's stored in
   the database. Keep it secret and never commit it.

### 3. Run it locally

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, confirm your
email, then go to **Settings** and paste in your Anthropic or OpenAI API key
before starting a project.

### 4. Deploy it (so you can use it outside your own computer)

1. Push this repo to GitHub (already set up if you're reading this from there).
2. Go to [vercel.com](https://vercel.com), sign up, click **Add New -> Project**,
   and import this GitHub repo.
3. In the "Environment Variables" step, add the same three values from your
   `.env.local` file (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `API_KEY_ENCRYPTION_SECRET`).
4. Click **Deploy**. Every future `git push` to the main branch will
   automatically redeploy the live site — nothing else to configure.

## Changing colors

All colors live in one place: [`src/app/globals.css`](src/app/globals.css), in
the `:root` block near the top, clearly marked. Change a hex value there and
every page picks it up automatically.

## Project structure (for reference)

- `src/app/` — every page and route of the app (Next.js App Router: each folder
  is a URL, `page.tsx` is what renders there)
- `src/components/` — reusable UI pieces (chat panes, forms, nav bar)
- `src/lib/ai/` — the client/mentor personas and the Anthropic/OpenAI adapter
- `src/lib/supabase/` — database/auth connection helpers
- `supabase/schema.sql` — the database schema, run once in Supabase's SQL editor
