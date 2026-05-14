-- Run this in the Supabase SQL editor to set up the StuddyPebble schema.
-- Tables are owned per-user via auth.uid(); RLS enforces ownership.

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  term text not null,
  definition text,
  notes text,
  external_links jsonb not null default '[]'::jsonb,
  term_image text,
  definition_image text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for existing installs:
alter table public.flashcards alter column definition drop not null;
alter table public.flashcards add column if not exists notes text;
alter table public.flashcards add column if not exists external_links jsonb not null default '[]'::jsonb;
alter table public.flashcards add column if not exists term_image text;
alter table public.flashcards add column if not exists definition_image text;

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  score int not null,
  total int not null,
  quiz_type text not null,
  completed_at timestamptz not null default now()
);

create table if not exists public.deck_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deck_collection_members (
  collection_id uuid not null references public.deck_collections(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (collection_id, group_id)
);

create index if not exists flashcards_group_idx on public.flashcards(group_id, position);
create index if not exists quiz_results_group_idx on public.quiz_results(group_id);
create index if not exists deck_collection_members_collection_idx on public.deck_collection_members(collection_id);
create index if not exists deck_collection_members_group_idx on public.deck_collection_members(group_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists groups_touch on public.groups;
create trigger groups_touch before update on public.groups
  for each row execute function public.touch_updated_at();

drop trigger if exists flashcards_touch on public.flashcards;
create trigger flashcards_touch before update on public.flashcards
  for each row execute function public.touch_updated_at();

drop trigger if exists deck_collections_touch on public.deck_collections;
create trigger deck_collections_touch before update on public.deck_collections
  for each row execute function public.touch_updated_at();

alter table public.groups enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_results enable row level security;
alter table public.deck_collections enable row level security;
alter table public.deck_collection_members enable row level security;

drop policy if exists "groups owner" on public.groups;
create policy "groups owner" on public.groups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "flashcards owner" on public.flashcards;
create policy "flashcards owner" on public.flashcards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "quiz_results owner" on public.quiz_results;
create policy "quiz_results owner" on public.quiz_results
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "deck_collections owner" on public.deck_collections;
create policy "deck_collections owner" on public.deck_collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "deck_collection_members owner" on public.deck_collection_members;
create policy "deck_collection_members owner" on public.deck_collection_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage bucket for flashcard images / GIFs.
-- Path layout: <user_id>/<group_id>/<side>-<timestamp>.<ext>
insert into storage.buckets (id, name, public)
values ('flashcard-images', 'flashcard-images', true)
on conflict (id) do nothing;

drop policy if exists "flashcard-images read" on storage.objects;
create policy "flashcard-images read" on storage.objects
  for select using (bucket_id = 'flashcard-images');

drop policy if exists "flashcard-images write own" on storage.objects;
create policy "flashcard-images write own" on storage.objects
  for insert with check (
    bucket_id = 'flashcard-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "flashcard-images update own" on storage.objects;
create policy "flashcard-images update own" on storage.objects
  for update using (
    bucket_id = 'flashcard-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "flashcard-images delete own" on storage.objects;
create policy "flashcard-images delete own" on storage.objects
  for delete using (
    bucket_id = 'flashcard-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
