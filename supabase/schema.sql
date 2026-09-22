-- SplitBrief database schema.
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.

-- One row per user: which AI provider they've chosen and their (encrypted) API key.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ai_provider text check (ai_provider in ('anthropic', 'openai')),
  ai_model text,
  api_key_encrypted text,
  created_at timestamptz not null default now()
);

-- One row per training project a designer starts.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  archetype text not null,
  brief text not null,
  client_persona text not null,
  industry text,
  created_at timestamptz not null default now()
);

-- If you're re-running this file against a database that already has the
-- projects table (from before the "generate a new job" feature), this adds
-- the missing column without touching existing rows.
alter table projects add column if not exists industry text;

-- Chat messages, one row per message, tagged to either the "client" or "mentor" thread.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  thread text not null check (thread in ('client', 'mentor')),
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists messages_project_thread_idx on messages (project_id, thread, created_at);

-- Automatically create a blank profile row whenever someone signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row Level Security: every user can only ever see/touch their own data.
alter table profiles enable row level security;
alter table projects enable row level security;
alter table messages enable row level security;

drop policy if exists "profiles: owner can select" on profiles;
create policy "profiles: owner can select" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: owner can update" on profiles;
create policy "profiles: owner can update" on profiles
  for update using (auth.uid() = id);

drop policy if exists "projects: owner can select" on projects;
create policy "projects: owner can select" on projects
  for select using (auth.uid() = user_id);

drop policy if exists "projects: owner can insert" on projects;
create policy "projects: owner can insert" on projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects: owner can delete" on projects;
create policy "projects: owner can delete" on projects
  for delete using (auth.uid() = user_id);

drop policy if exists "messages: owner can select" on messages;
create policy "messages: owner can select" on messages
  for select using (
    exists (select 1 from projects where projects.id = messages.project_id and projects.user_id = auth.uid())
  );

drop policy if exists "messages: owner can insert" on messages;
create policy "messages: owner can insert" on messages
  for insert with check (
    exists (select 1 from projects where projects.id = messages.project_id and projects.user_id = auth.uid())
  );

-- Storage bucket for uploaded work-in-progress images.
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', false)
on conflict (id) do nothing;

drop policy if exists "project-images: owner can read" on storage.objects;
create policy "project-images: owner can read" on storage.objects
  for select using (bucket_id = 'project-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "project-images: owner can upload" on storage.objects;
create policy "project-images: owner can upload" on storage.objects
  for insert with check (bucket_id = 'project-images' and auth.uid()::text = (storage.foldername(name))[1]);
