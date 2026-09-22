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
  crit_notes text,
  crit_notes_generated_at timestamptz,
  difficulty text not null default 'standard' check (difficulty in ('mild', 'standard', 'intense')),
  created_at timestamptz not null default now()
);

-- If you're re-running this file against a database that already has the
-- projects table (from before the "generate a new job" / "crit notes" /
-- "difficulty" features), this adds the missing columns without touching
-- existing rows.
alter table projects add column if not exists industry text;
alter table projects add column if not exists crit_notes text;
alter table projects add column if not exists crit_notes_generated_at timestamptz;
alter table projects add column if not exists difficulty text not null default 'standard';

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

drop policy if exists "projects: owner can update" on projects;
create policy "projects: owner can update" on projects
  for update using (auth.uid() = user_id);

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

-- ============================================================
-- Classroom / instructor mode
-- ============================================================

-- A classroom is owned by whichever user created it (the "instructor").
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- Which users ("students") belong to which classroom.
create table if not exists classroom_members (
  classroom_id uuid not null references classrooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (classroom_id, user_id)
);

-- A fixed brief an instructor assigns to their whole classroom. Every student
-- who starts it gets their own project with this exact same brief, so results
-- are directly comparable.
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms (id) on delete cascade,
  title text not null,
  archetype text not null,
  difficulty text not null default 'standard' check (difficulty in ('mild', 'standard', 'intense')),
  brief text not null,
  client_persona text not null,
  industry text,
  created_at timestamptz not null default now()
);

-- Links a student's own project back to the assignment it was started from.
alter table projects add column if not exists assignment_id uuid references assignments (id) on delete set null;

-- Joining a classroom goes through this function (rather than a direct insert)
-- so a student only ever needs the invite code, never direct table access.
create or replace function join_classroom(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_classroom_id uuid;
begin
  select id into found_classroom_id from classrooms where invite_code = upper(code);
  if found_classroom_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into classroom_members (classroom_id, user_id)
  values (found_classroom_id, auth.uid())
  on conflict do nothing;

  return found_classroom_id;
end;
$$;

alter table classrooms enable row level security;
alter table classroom_members enable row level security;
alter table assignments enable row level security;

drop policy if exists "classrooms: owner can select" on classrooms;
create policy "classrooms: owner can select" on classrooms
  for select using (auth.uid() = owner_id);

drop policy if exists "classrooms: member can select" on classrooms;
create policy "classrooms: member can select" on classrooms
  for select using (
    exists (select 1 from classroom_members where classroom_members.classroom_id = classrooms.id and classroom_members.user_id = auth.uid())
  );

drop policy if exists "classrooms: owner can insert" on classrooms;
create policy "classrooms: owner can insert" on classrooms
  for insert with check (auth.uid() = owner_id);

drop policy if exists "classroom_members: owner can select" on classroom_members;
create policy "classroom_members: owner can select" on classroom_members
  for select using (
    exists (select 1 from classrooms where classrooms.id = classroom_members.classroom_id and classrooms.owner_id = auth.uid())
  );

drop policy if exists "classroom_members: self can select" on classroom_members;
create policy "classroom_members: self can select" on classroom_members
  for select using (auth.uid() = user_id);

drop policy if exists "assignments: owner can select" on assignments;
create policy "assignments: owner can select" on assignments
  for select using (
    exists (select 1 from classrooms where classrooms.id = assignments.classroom_id and classrooms.owner_id = auth.uid())
  );

drop policy if exists "assignments: member can select" on assignments;
create policy "assignments: member can select" on assignments
  for select using (
    exists (select 1 from classroom_members where classroom_members.classroom_id = assignments.classroom_id and classroom_members.user_id = auth.uid())
  );

drop policy if exists "assignments: owner can insert" on assignments;
create policy "assignments: owner can insert" on assignments
  for insert with check (
    exists (select 1 from classrooms where classrooms.id = assignments.classroom_id and classrooms.owner_id = auth.uid())
  );

drop policy if exists "assignments: owner can delete" on assignments;
create policy "assignments: owner can delete" on assignments
  for delete using (
    exists (select 1 from classrooms where classrooms.id = assignments.classroom_id and classrooms.owner_id = auth.uid())
  );

-- Let a classroom's instructor read (but never write) a student's project and
-- messages, but only for projects started from one of their assignments.
drop policy if exists "projects: classroom owner can view submissions" on projects;
create policy "projects: classroom owner can view submissions" on projects
  for select using (
    assignment_id is not null and exists (
      select 1 from assignments
      join classrooms on classrooms.id = assignments.classroom_id
      where assignments.id = projects.assignment_id and classrooms.owner_id = auth.uid()
    )
  );

drop policy if exists "messages: classroom owner can view submissions" on messages;
create policy "messages: classroom owner can view submissions" on messages
  for select using (
    exists (
      select 1 from projects
      join assignments on assignments.id = projects.assignment_id
      join classrooms on classrooms.id = assignments.classroom_id
      where projects.id = messages.project_id and classrooms.owner_id = auth.uid()
    )
  );
