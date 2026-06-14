-- okane :: initial schema
-- Every table is owned by a user (user_id = auth.uid()) and locked down with
-- Row-Level Security so a logged-in user can only ever read/write their own rows.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles : one row per auth user, holds display preferences
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  base_currency text not null default 'EUR',
  -- manual FX rate used only for the optional "combined" dashboard view:
  -- value of 1 USD expressed in EUR (e.g. 0.92). Honest estimate, no live feed.
  usd_to_eur    numeric(12, 6) not null default 0.92,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- accounts : a bank account / card, each in a single currency
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       text not null default 'checking',
  currency   text not null default 'EUR',
  created_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts (user_id);

-- ---------------------------------------------------------------------------
-- categories : how spending is grouped. kind = expense | income
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  kind       text not null default 'expense',
  color      text not null default '#1fa862',
  icon       text not null default '💸',
  created_at timestamptz not null default now()
);
create index if not exists categories_user_idx on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- transactions : signed amount. negative = money out, positive = money in.
-- currency is denormalised from the account so historical rows stay correct.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  account_id  uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  posted_on   date not null,
  description text not null default '',
  amount      numeric(14, 2) not null,
  currency    text not null default 'EUR',
  notes       text,
  -- de-dupe key for CSV re-imports (hash of account+date+amount+description)
  import_hash text,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions (user_id);
create index if not exists transactions_date_idx on public.transactions (user_id, posted_on desc);
create unique index if not exists transactions_dedupe_idx
  on public.transactions (user_id, import_hash)
  where import_hash is not null;

-- ---------------------------------------------------------------------------
-- budgets : a monthly spending cap for a category, in a given currency
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount      numeric(14, 2) not null,
  currency    text not null default 'EUR',
  created_at  timestamptz not null default now()
);
create unique index if not exists budgets_unique_idx
  on public.budgets (user_id, category_id, currency);

-- ---------------------------------------------------------------------------
-- categorization_rules : auto-assign a category when description matches text
-- ---------------------------------------------------------------------------
create table if not exists public.categorization_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  match_text  text not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists rules_user_idx on public.categorization_rules (user_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security : the privacy backbone
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.accounts             enable row level security;
alter table public.categories           enable row level security;
alter table public.transactions         enable row level security;
alter table public.budgets              enable row level security;
alter table public.categorization_rules enable row level security;

-- profiles keyed on id; everything else on user_id
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'transactions', 'budgets', 'categorization_rules'
  ] loop
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- On signup: create a profile + a starter set of categories automatically
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, kind, color, icon) values
    (new.id, 'Income',          'income',  '#1fa862', '💰'),
    (new.id, 'Groceries',       'expense', '#16a34a', '🛒'),
    (new.id, 'Rent & Housing',  'expense', '#0ea5e9', '🏠'),
    (new.id, 'Utilities',       'expense', '#6366f1', '💡'),
    (new.id, 'Transport',       'expense', '#f59e0b', '🚗'),
    (new.id, 'Dining Out',      'expense', '#ef4444', '🍽️'),
    (new.id, 'Shopping',        'expense', '#ec4899', '🛍️'),
    (new.id, 'Subscriptions',   'expense', '#8b5cf6', '🔁'),
    (new.id, 'Health',          'expense', '#14b8a6', '🩺'),
    (new.id, 'Entertainment',   'expense', '#f97316', '🎬'),
    (new.id, 'Travel',          'expense', '#06b6d4', '✈️'),
    (new.id, 'Fees & Charges',  'expense', '#64748b', '🏦'),
    (new.id, 'Other',           'expense', '#94a3b8', '📦');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
