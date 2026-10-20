-- Whisper MVP database schema for Supabase.
-- Run this in Supabase SQL Editor AFTER creating a project.
-- IMPORTANT: review/test RLS policies before a public launch.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (char_length(handle) between 3 and 22),
  bio text not null default '' check (char_length(bio) <= 120),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  topic text not null,
  body text not null check (char_length(body) between 8 and 1000),
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  confession_id uuid not null references public.confessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('💚','🫂','🌱','✨')),
  created_at timestamptz not null default now(),
  unique(confession_id, user_id, reaction)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  confession_id uuid not null references public.confessions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  confession_id uuid references public.confessions(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 120),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (confession_id is not null or comment_id is not null)
);

create index if not exists confessions_created_at_idx on public.confessions(created_at desc);
create index if not exists confessions_topic_idx on public.confessions(topic);
create index if not exists comments_confession_idx on public.comments(confession_id, created_at);
create index if not exists reports_status_idx on public.reports(status, created_at);

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.confessions enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- Public profile rows contain only public-facing pseudonymous information.
create policy "Profiles are visible to everyone" on public.profiles
  for select using (true);
create policy "Users create own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Communities readable by everyone" on public.communities
  for select using (true);
create policy "Members list is visible to signed-in users" on public.community_members
  for select to authenticated using (true);
create policy "Users join as themselves" on public.community_members
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users leave their own communities" on public.community_members
  for delete to authenticated using (auth.uid() = user_id);

-- Anyone may read published public confessions; owners can read their own private ones.
create policy "Read published public or own confessions" on public.confessions
  for select using (
    (status = 'published' and visibility = 'public')
    or auth.uid() = author_id
  );
create policy "Signed-in users create own confessions" on public.confessions
  for insert to authenticated with check (auth.uid() = author_id);
create policy "Authors update own confessions" on public.confessions
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Authors delete own confessions" on public.confessions
  for delete to authenticated using (auth.uid() = author_id);

create policy "Read reactions for visible confessions" on public.reactions
  for select using (exists (
    select 1 from public.confessions c where c.id = confession_id
      and ((c.status = 'published' and c.visibility = 'public') or c.author_id = auth.uid())
  ));
create policy "Users add own reactions" on public.reactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove own reactions" on public.reactions
  for delete to authenticated using (auth.uid() = user_id);

create policy "Read comments on visible confessions" on public.comments
  for select using (exists (
    select 1 from public.confessions c where c.id = confession_id
      and ((c.status = 'published' and c.visibility = 'public') or c.author_id = auth.uid())
  ));
create policy "Users add own comments" on public.comments
  for insert to authenticated with check (auth.uid() = author_id);
create policy "Authors update own comments" on public.comments
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Authors delete own comments" on public.comments
  for delete to authenticated using (auth.uid() = author_id);

-- Reports are private to their reporter in this starter policy.
-- A production moderation dashboard should use a trusted server/Edge Function and staff roles.
create policy "Users create own reports" on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Users read own reports" on public.reports
  for select to authenticated using (auth.uid() = reporter_id);

insert into public.communities(slug,name,description) values
 ('relationships','Relationships','Love, heartbreak, boundaries and all the in-between.'),
 ('college-life','College Life','Deadlines, new beginnings and figuring it out.'),
 ('friendship','Friendship','Finding your people and learning to show up.'),
 ('mental-wellness','Mental Wellness','Small steps, honest feelings, gentle support.'),
 ('family','Family','The complicated, beautiful, messy bits of home.'),
 ('late-night-thoughts','Late Night Thoughts','For the thoughts that show up after midnight.')
on conflict (slug) do nothing;

-- Create pseudonymous profile after auth signup. Handle is generated, not derived from email.
create or replace function public.create_whisper_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_handle text;
begin
  new_handle := 'fern_' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  insert into public.profiles(id, handle) values (new.id, new_handle)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_whisper_user_created on auth.users;
create trigger on_whisper_user_created
  after insert on auth.users
  for each row execute procedure public.create_whisper_profile();

-- Launch checklist:
-- * Add server-side rate limits and abuse/spam detection.
-- * Create trusted moderation/admin roles; never let a client mark reports resolved.
-- * Consider preventing comments/reactions from users blocked by private-account settings.
-- * Configure email confirmation, password reset, CAPTCHA and redirect URLs in Supabase.
-- * Do not promise full anonymity: infrastructure providers may retain security logs.
