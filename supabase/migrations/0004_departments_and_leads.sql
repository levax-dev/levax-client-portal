-- Departments: sub-units within a client org (Marketing, Sales, ...).
-- Clients can belong to multiple departments; projects declare which
-- department(s) they serve, which is what lets clients in that department
-- raise tickets into that project. A ticket/project with no department is
-- "top level" — visible only to staff and org admins, not regular members.

create table departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table org_member_departments (
  id uuid primary key default gen_random_uuid(),
  org_member_id uuid not null references org_members (id) on delete cascade,
  department_id uuid not null references departments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (org_member_id, department_id)
);

create table project_departments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  department_id uuid not null references departments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, department_id)
);

alter table projects add column lead_id uuid references profiles (id) on delete set null;
alter table issues add column department_id uuid references departments (id) on delete set null;

create index idx_departments_org on departments (org_id);
create index idx_org_member_departments_member on org_member_departments (org_member_id);
create index idx_org_member_departments_dept on org_member_departments (department_id);
create index idx_project_departments_project on project_departments (project_id);
create index idx_project_departments_dept on project_departments (department_id);
create index idx_projects_lead on projects (lead_id);
create index idx_issues_department on issues (department_id);

-- New organizations no longer get an automatic "Support" project — staff
-- must explicitly create a project (choosing its departments) before
-- clients in that department can raise tickets into it.
drop trigger if exists trg_on_organization_created on organizations;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────

alter table departments enable row level security;
alter table org_member_departments enable row level security;
alter table project_departments enable row level security;

-- A non-admin member can see a department-scoped row only if they belong
-- to that department; org admins and staff always can. NULL department
-- ("top level") is admin/staff-only.
create function can_view_department(p_org uuid, p_dept uuid) returns boolean as $$
  select
    is_org_admin(auth.uid(), p_org)
    or (
      p_dept is not null and exists (
        select 1 from org_members m
        join org_member_departments omd on omd.org_member_id = m.id
        where m.user_id = auth.uid() and m.org_id = p_org and omd.department_id = p_dept
      )
    )
$$ language sql stable security definer set search_path = public;

-- A project is visible to a non-admin member if at least one of its
-- departments is one they belong to.
create function can_view_project(p_project uuid, p_org uuid) returns boolean as $$
  select
    is_org_admin(auth.uid(), p_org)
    or exists (
      select 1 from project_departments pd
      where pd.project_id = p_project and can_view_department(p_org, pd.department_id)
    )
$$ language sql stable security definer set search_path = public;

-- departments: any org member can see the list; staff/org admins manage
create policy departments_select on departments for select using (
  is_staff(auth.uid()) or is_org_member(auth.uid(), org_id)
);
create policy departments_insert on departments for insert with check (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy departments_update on departments for update using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);
create policy departments_delete on departments for delete using (
  is_staff(auth.uid()) or is_org_admin(auth.uid(), org_id)
);

-- org_member_departments: visible to the org; only staff/org admins assign
create policy org_member_departments_select on org_member_departments for select using (
  is_staff(auth.uid()) or exists (
    select 1 from org_members m where m.id = org_member_departments.org_member_id
    and is_org_member(auth.uid(), m.org_id)
  )
);
create policy org_member_departments_insert on org_member_departments for insert with check (
  is_staff(auth.uid()) or exists (
    select 1 from org_members m where m.id = org_member_departments.org_member_id
    and is_org_admin(auth.uid(), m.org_id)
  )
);
create policy org_member_departments_delete on org_member_departments for delete using (
  is_staff(auth.uid()) or exists (
    select 1 from org_members m where m.id = org_member_departments.org_member_id
    and is_org_admin(auth.uid(), m.org_id)
  )
);

-- project_departments: follows project visibility; staff/org admins manage
create policy project_departments_select on project_departments for select using (
  is_staff(auth.uid()) or exists (
    select 1 from projects p where p.id = project_departments.project_id
    and is_org_member(auth.uid(), p.org_id)
  )
);
create policy project_departments_insert on project_departments for insert with check (
  is_staff(auth.uid()) or exists (
    select 1 from projects p where p.id = project_departments.project_id
    and is_org_admin(auth.uid(), p.org_id)
  )
);
create policy project_departments_delete on project_departments for delete using (
  is_staff(auth.uid()) or exists (
    select 1 from projects p where p.id = project_departments.project_id
    and is_org_admin(auth.uid(), p.org_id)
  )
);

-- Replace projects/issues select policies with department-aware versions.
drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (
  is_staff(auth.uid())
  or (is_org_member(auth.uid(), org_id) and can_view_project(id, org_id))
);

drop policy if exists issues_select on issues;
create policy issues_select on issues for select using (
  is_staff(auth.uid())
  or (is_org_member(auth.uid(), org_id) and can_view_department(org_id, department_id))
);
