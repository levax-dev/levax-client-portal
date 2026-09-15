-- Levax Client Portal — initial schema
-- Multi-tenant support/project portal: organizations, membership, projects/boards,
-- issues (tickets + work items unified), comments, attachments, knowledge base, notifications.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────

create type platform_role as enum ('super_admin', 'staff', 'client');
create type org_role as enum ('admin', 'member');
create type org_status as enum ('active', 'suspended');
create type project_status as enum ('active', 'on_hold', 'completed', 'archived');
create type issue_type as enum ('ticket', 'task', 'bug', 'feature');
create type issue_priority as enum ('low', 'medium', 'high', 'urgent');
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- ─────────────────────────────────────────────────────────────────────────
-- Core tables
-- ─────────────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  platform_role platform_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  status org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role org_role not null default 'member',
  invited_by uuid references profiles (id) on delete set null,
  token uuid not null default gen_random_uuid(),
  status invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'active',
  is_support_project boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table board_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  color text not null default '#64748b',
  is_done_column boolean not null default false,
  created_at timestamptz not null default now()
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  column_id uuid not null references board_columns (id) on delete restrict,
  type issue_type not null default 'ticket',
  title text not null,
  description text,
  priority issue_priority not null default 'medium',
  reporter_id uuid references profiles (id) on delete set null,
  assignee_id uuid references profiles (id) on delete set null,
  position double precision not null default 0,
  due_date date,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  issue_id uuid references issues (id) on delete cascade,
  comment_id uuid references issue_comments (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer not null default 0,
  content_type text,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint attachments_owner_check check (
    (issue_id is not null and comment_id is null) or
    (issue_id is null and comment_id is not null)
  )
);

create table kb_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table kb_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references kb_categories (id) on delete set null,
  org_id uuid references organizations (id) on delete cascade,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  is_published boolean not null default true,
  view_count integer not null default 0,
  author_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  org_id uuid references organizations (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────

create index idx_org_members_user on org_members (user_id);
create index idx_org_members_org on org_members (org_id);
create index idx_org_invites_org on org_invites (org_id);
create index idx_org_invites_token on org_invites (token);
create index idx_projects_org on projects (org_id);
create index idx_board_columns_project on board_columns (project_id, position);
create index idx_issues_org on issues (org_id);
create index idx_issues_project on issues (project_id, column_id, position);
create index idx_issues_assignee on issues (assignee_id);
create index idx_issues_type on issues (org_id, type);
create index idx_issue_comments_issue on issue_comments (issue_id, created_at);
create index idx_attachments_issue on attachments (issue_id);
create index idx_attachments_comment on attachments (comment_id);
create index idx_kb_articles_category on kb_articles (category_id);
create index idx_kb_articles_org on kb_articles (org_id);
create index idx_notifications_user on notifications (user_id, is_read, created_at desc);

-- Full-text search over the knowledge base
alter table kb_articles add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) stored;
create index idx_kb_articles_search on kb_articles using gin (search_vector);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_organizations_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger trg_issues_updated_at before update on issues
  for each row execute function set_updated_at();
create trigger trg_issue_comments_updated_at before update on issue_comments
  for each row execute function set_updated_at();
create trigger trg_kb_articles_updated_at before update on kb_articles
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- New auth user -> profile row
-- ─────────────────────────────────────────────────────────────────────────

create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- New organization -> seed default Support project + board columns
-- ─────────────────────────────────────────────────────────────────────────

create function seed_support_project() returns trigger as $$
declare
  v_project_id uuid;
begin
  insert into public.projects (org_id, name, description, is_support_project, status)
  values (new.id, 'Support', 'Support tickets and requests', true, 'active')
  returning id into v_project_id;

  insert into public.board_columns (project_id, name, position, color, is_done_column) values
    (v_project_id, 'Open', 0, '#3b82f6', false),
    (v_project_id, 'In Progress', 1, '#f59e0b', false),
    (v_project_id, 'Waiting on Client', 2, '#a855f7', false),
    (v_project_id, 'Resolved', 3, '#22c55e', true),
    (v_project_id, 'Closed', 4, '#64748b', true);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_organization_created
  after insert on organizations
  for each row execute function seed_support_project();

-- Non-support projects get a standard board too, seeded from the application layer
-- via seed_default_columns() so callers can choose when it runs (e.g. right after insert).
create function seed_default_columns(p_project_id uuid) returns void as $$
begin
  insert into public.board_columns (project_id, name, position, color, is_done_column) values
    (p_project_id, 'Backlog', 0, '#64748b', false),
    (p_project_id, 'To Do', 1, '#3b82f6', false),
    (p_project_id, 'In Progress', 2, '#f59e0b', false),
    (p_project_id, 'In Review', 3, '#a855f7', false),
    (p_project_id, 'Done', 4, '#22c55e', true);
end;
$$ language plpgsql security definer set search_path = public;

create function increment_kb_view_count(p_article_id uuid) returns void as $$
  update public.kb_articles set view_count = view_count + 1 where id = p_article_id;
$$ language sql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Helper functions used by RLS policies
-- ─────────────────────────────────────────────────────────────────────────

create function is_staff(p_user uuid) returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = p_user and platform_role in ('super_admin', 'staff')
  );
$$ language sql stable security definer set search_path = public;

create function is_org_member(p_user uuid, p_org uuid) returns boolean as $$
  select exists (
    select 1 from public.org_members
    where user_id = p_user and org_id = p_org
  );
$$ language sql stable security definer set search_path = public;

create function is_org_admin(p_user uuid, p_org uuid) returns boolean as $$
  select exists (
    select 1 from public.org_members
    where user_id = p_user and org_id = p_org and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table org_invites enable row level security;
alter table projects enable row level security;
alter table board_columns enable row level security;
alter table issues enable row level security;
alter table issue_comments enable row level security;
alter table attachments enable row level security;
alter table kb_categories enable row level security;
alter table kb_articles enable row level security;
alter table notifications enable row level security;

-- profiles: everyone can read profiles of people who share an org with them, or staff; only owner can update own row
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or is_staff(auth.uid())
  or exists (
    select 1 from org_members m1
    join org_members m2 on m1.org_id = m2.org_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  )
);
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- organizations: staff see all; members see their own org
create policy organizations_select on organizations for select using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), id)
);
create policy organizations_insert_staff on organizations for insert with check (is_staff(auth.uid()));
create policy organizations_update on organizations for update using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), id)
);

-- org_members: staff full visibility; org members can see co-members; only admins/staff can manage
create policy org_members_select on org_members for select using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy org_members_insert on org_members for insert with check (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy org_members_update on org_members for update using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy org_members_delete on org_members for delete using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);

-- org_invites: admins/staff manage invites for their org
create policy org_invites_select on org_invites for select using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy org_invites_insert on org_invites for insert with check (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy org_invites_update on org_invites for update using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy org_invites_delete on org_invites for delete using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);

-- projects
create policy projects_select on projects for select using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy projects_insert on projects for insert with check (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy projects_update on projects for update using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy projects_delete on projects for delete using (is_staff(auth.uid()));

-- board_columns: same visibility as the parent project
create policy board_columns_select on board_columns for select using (
  is_staff(auth.uid()) or exists (
    select 1 from projects p where p.id = board_columns.project_id and is_org_member(auth.uid(), p.org_id)
  )
);
create policy board_columns_all on board_columns for all using (
  is_staff(auth.uid()) or exists (
    select 1 from projects p where p.id = board_columns.project_id and is_org_admin(auth.uid(), p.org_id)
  )
);

-- issues: any org member can read/create/update issues in their org; staff bypass
create policy issues_select on issues for select using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy issues_insert on issues for insert with check (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy issues_update on issues for update using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy issues_delete on issues for delete using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);

-- issue_comments: internal notes are staff-only; regular comments visible to the whole org
create policy issue_comments_select on issue_comments for select using (
  is_staff(auth.uid())
  or (
    not is_internal
    and exists (
      select 1 from issues i where i.id = issue_comments.issue_id and is_org_member(auth.uid(), i.org_id)
    )
  )
);
create policy issue_comments_insert on issue_comments for insert with check (
  is_staff(auth.uid())
  or (
    not is_internal
    and exists (
      select 1 from issues i where i.id = issue_comments.issue_id and is_org_member(auth.uid(), i.org_id)
    )
  )
);
create policy issue_comments_update on issue_comments for update using (author_id = auth.uid() or is_staff(auth.uid()));
create policy issue_comments_delete on issue_comments for delete using (author_id = auth.uid() or is_staff(auth.uid()));

-- attachments: follow the parent issue/comment's org visibility
create policy attachments_select on attachments for select using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy attachments_insert on attachments for insert with check (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy attachments_delete on attachments for delete using (
  uploaded_by = auth.uid() or is_staff(auth.uid())
);

-- kb_categories: readable by anyone signed in; only staff manage
create policy kb_categories_select on kb_categories for select using (auth.uid() is not null);
create policy kb_categories_all on kb_categories for all using (is_staff(auth.uid()));

-- kb_articles: global articles (org_id null) visible to all signed-in users; org-scoped
-- articles only to that org's members. Only published articles are visible to clients.
create policy kb_articles_select on kb_articles for select using (
  is_staff(auth.uid())
  or (
    is_published
    and (org_id is null or is_org_member(auth.uid(), org_id))
  )
);
create policy kb_articles_all on kb_articles for all using (is_staff(auth.uid()));

-- notifications: only the recipient can see/manage their own notifications
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());
create policy notifications_insert on notifications for insert with check (true);
create policy notifications_delete on notifications for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Storage bucket for attachments
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Files are stored at `${org_id}/${issue_id}/${filename}`. A member can read/write
-- only within the org folder they belong to; staff can read/write everything.
create policy storage_attachments_select on storage.objects for select using (
  bucket_id = 'attachments' and (
    is_staff(auth.uid()) or is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);
create policy storage_attachments_insert on storage.objects for insert with check (
  bucket_id = 'attachments' and (
    is_staff(auth.uid()) or is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);
create policy storage_attachments_delete on storage.objects for delete using (
  bucket_id = 'attachments' and (
    is_staff(auth.uid()) or is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);
