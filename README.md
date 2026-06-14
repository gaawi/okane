# Okane お金

A private, mobile-first personal finance app — like Rocket Money, but you own
the data. Upload bank transactions (CSV) or add them by hand, tag them by
category, and track spending against budgets with an **annual-first** overview.
Built for **EUR and USD** accounts side by side.

- 🔒 **Private by design** — email/password login, and every row is locked to
  your account by Postgres Row-Level Security. No one (not even another logged-in
  user) can read your data.
- 📅 **Annual view first** — see the whole year at a glance with a monthly trend
  chart, then drill into any month.
- 📄 **CSV import + manual entry** — flexible column mapping handles different
  bank formats, European/US number styles, and split debit/credit columns.
- 🏷️ **Categories & auto-rules** — auto-tag transactions on import by matching
  text in the description.
- 🎯 **Budgets** — set a monthly cap per category; the yearly view scales it ×12.
- 💶💵 **Multi-currency** — EUR and USD are tracked separately (no silent
  conversion). Each account has its own currency.
- 📱 **Mobile-first PWA** — installable to your home screen.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres, Auth, and Row-Level Security
- **Vercel** — hosting (any Next.js host works)

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (the free tier is
   enough). Pick a strong database password.
2. Once it's ready, open **SQL Editor → New query**, paste the entire contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and
   **Run**. This creates all tables, the RLS policies, and a trigger that gives
   each new user a starter set of categories.
3. Open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Email confirmation:** by default Supabase emails a confirmation link on
> sign-up. For a personal app you can turn this off under
> **Authentication → Sign In / Providers → Email → "Confirm email" (off)** so you
> can log in immediately.

### 2. Run locally

```bash
cp .env.example .env.local   # then paste your two keys into .env.local
npm install
npm run dev                  # http://localhost:3000
```

Open the app, create your account, then add an account per currency
(e.g. one EUR, one USD) on the **Settings → Accounts** page before importing.

### 3. Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com): **Add New → Project**, import the repo.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under the project's **Settings → Environment
   Variables**.
4. Deploy. (Optional) In Supabase **Authentication → URL Configuration**, set the
   Site URL to your Vercel domain.

---

## Importing a CSV

1. Go to the **Add** tab (➕) → **Import CSV**.
2. Choose the account (this sets the currency) and upload your bank's CSV export.
3. Map the **date**, **description**, and **amount** columns. The importer
   auto-detects common names and number formats. If your bank uses separate
   "debit" and "credit" columns, switch to **Debit + Credit** mode.
4. Review the preview, then import. Re-importing the same file is safe —
   duplicate rows (same account, date, amount, and description) are skipped.

A sample file is included at [`sample-transactions.csv`](sample-transactions.csv).

## Data model

| Table | Purpose |
|-------|---------|
| `profiles` | per-user display preferences (base currency, reference FX rate) |
| `accounts` | one bank account/card, each in a single currency |
| `categories` | spending groups (expense/income), with icon + color |
| `transactions` | signed amounts (negative = money out), denormalized currency |
| `budgets` | a monthly cap per category + currency |
| `categorization_rules` | text → category, applied on import |

Every table outside `profiles` is keyed on `user_id` and protected by an
identical RLS policy: `auth.uid() = user_id` for both reads and writes.
