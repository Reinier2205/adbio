-- ============================================================
-- Recipe Box — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Profiles ────────────────────────────────────────────────
-- Auto-created on first Google sign-in via trigger below
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- Trigger: create profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Chef'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Recipes ─────────────────────────────────────────────────
create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null default 'Untitled recipe',
  servings     text default '',
  prep_time    text default '',
  cook_time    text default '',
  ingredients  jsonb not null default '[]'::jsonb,  -- ["2 cups flour", ...]
  steps        jsonb not null default '[]'::jsonb,  -- ["Mix dry ...", ...]
  tags         text[] default '{}',
  notes        text default '',
  photo_url    text default '',          -- Supabase Storage public URL
  photo_path   text default '',          -- Storage path for deletion
  source_text  text default '',          -- raw input kept for reference
  source_url   text default '',          -- if extracted from a URL
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at
  before update on public.recipes
  for each row execute procedure public.set_updated_at();

-- Full-text search: simple GIN indexes on individual columns (IMMUTABLE-safe)
create index if not exists recipes_title_idx on public.recipes using gin(to_tsvector('english', coalesce(title, '')));
create index if not exists recipes_tags_idx  on public.recipes using gin(tags);

-- ── Camp Books ───────────────────────────────────────────────
create table if not exists public.camp_books (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text default '',
  created_by   uuid not null references public.profiles(id) on delete cascade,
  invite_code  text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at   timestamptz default now()
);

-- ── Camp Book Members ────────────────────────────────────────
create table if not exists public.camp_book_members (
  book_id    uuid not null references public.camp_books(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (book_id, user_id)
);

-- ── Camp Book Recipes ────────────────────────────────────────
-- Independent copies: each entry IS a recipe owned by the person who added/copied it
-- added_to_book links it to the camp book
create table if not exists public.camp_book_recipes (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.camp_books(id) on delete cascade,
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  added_by   uuid not null references public.profiles(id),
  added_at   timestamptz default now(),
  unique (book_id, recipe_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.recipes           enable row level security;
alter table public.camp_books        enable row level security;
alter table public.camp_book_members enable row level security;
alter table public.camp_book_recipes enable row level security;

-- ── Profiles policies ───────────────────────────────────────
create policy "Users can read any profile"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Recipes policies ────────────────────────────────────────
-- Owner: full CRUD
create policy "Owner can do anything with their recipes"
  on public.recipes for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Camp book members can read recipes that are in a camp book they belong to
create policy "Camp members can read shared recipes"
  on public.recipes for select
  using (
    exists (
      select 1
      from public.camp_book_recipes cbr
      join public.camp_book_members cbm on cbm.book_id = cbr.book_id
      where cbr.recipe_id = recipes.id
        and cbm.user_id = auth.uid()
    )
  );

-- Camp book members can update recipes in their shared books
create policy "Camp members can update shared recipes"
  on public.recipes for update
  using (
    exists (
      select 1
      from public.camp_book_recipes cbr
      join public.camp_book_members cbm on cbm.book_id = cbr.book_id
      where cbr.recipe_id = recipes.id
        and cbm.user_id = auth.uid()
    )
  );

-- ── Camp Books policies ─────────────────────────────────────
create policy "Members can read their camp books"
  on public.camp_books for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.camp_book_members
      where book_id = camp_books.id and user_id = auth.uid()
    )
  );

-- Anyone signed in can look up a camp book by invite code (for joining)
create policy "Anyone can look up a camp book by invite code"
  on public.camp_books for select
  using (auth.uid() is not null);

create policy "Creator can update camp book"
  on public.camp_books for update
  using (auth.uid() = created_by);

create policy "Creator can delete camp book"
  on public.camp_books for delete
  using (auth.uid() = created_by);

create policy "Signed-in users can create camp books"
  on public.camp_books for insert
  with check (auth.uid() = created_by);

-- ── Camp Book Members policies ───────────────────────────────
create policy "Members can see who is in their books"
  on public.camp_book_members for select
  using (
    exists (
      select 1 from public.camp_book_members m2
      where m2.book_id = camp_book_members.book_id
        and m2.user_id = auth.uid()
    )
    or exists (
      select 1 from public.camp_books
      where id = camp_book_members.book_id and created_by = auth.uid()
    )
  );

create policy "Users can join a camp book"
  on public.camp_book_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave a camp book"
  on public.camp_book_members for delete
  using (auth.uid() = user_id);

-- ── Camp Book Recipes policies ───────────────────────────────
create policy "Members can see camp book recipes"
  on public.camp_book_recipes for select
  using (
    exists (
      select 1 from public.camp_book_members
      where book_id = camp_book_recipes.book_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.camp_books
      where id = camp_book_recipes.book_id and created_by = auth.uid()
    )
  );

create policy "Members can add recipes to camp books they belong to"
  on public.camp_book_recipes for insert
  with check (
    auth.uid() = added_by
    and exists (
      select 1 from public.camp_book_members
      where book_id = camp_book_recipes.book_id and user_id = auth.uid()
    )
  );

create policy "Members can remove recipes from camp books"
  on public.camp_book_recipes for delete
  using (
    exists (
      select 1 from public.camp_book_members
      where book_id = camp_book_recipes.book_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.camp_books
      where id = camp_book_recipes.book_id and created_by = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket: recipe-photos
-- Run this separately in Supabase Dashboard > Storage, OR
-- it will be created automatically by the app on first upload.
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('recipe-photos', 'recipe-photos', true)
-- on conflict do nothing;

-- Storage RLS: owners manage their own photos; anyone can view (public bucket)
-- These are set via the Supabase dashboard Storage > Policies, or:
-- create policy "Anyone can view recipe photos"
--   on storage.objects for select using (bucket_id = 'recipe-photos');
-- create policy "Owners can upload recipe photos"
--   on storage.objects for insert
--   with check (bucket_id = 'recipe-photos' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Owners can delete their recipe photos"
--   on storage.objects for delete
--   using (bucket_id = 'recipe-photos' and auth.uid()::text = (storage.foldername(name))[1]);
