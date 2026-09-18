-- Delivery planning, ticket taxonomy, project approvals and work tracking.
--
-- Four themes:
--   1. Projects need client sign-off before work starts (approval_status).
--   2. Tickets are categorised (app request / automation / bug / BI report).
--   3. Every task traces back to the ticket that caused it (parent_ticket_id).
--   4. Issues carry a real timeline (start_date + due_date) and an effort
--      estimate, so "what lands today / this week" and per-person capacity
--      are answerable from the database rather than guessed at.

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_category as enum (
    'app_request',          -- App Request — new features
    'workflow_automation',  -- New workflow automations (mailers, etc.)
    'bug_report',           -- Bug reports
    'bi_report',            -- BI reports
    'other'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Projects: client approval + planned dates
-- ─────────────────────────────────────────────────────────────────────────

-- Existing projects are grandfathered in as approved; only newly requested
-- ones start life as 'pending'. Approval is tracked separately from `status`
-- so a project can be approved but not yet started, or paused after approval.
alter table projects
  add column if not exists approval_status approval_status not null default 'approved',
  add column if not exists requested_by uuid references profiles (id) on delete set null,
  add column if not exists decided_by uuid references profiles (id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_note text,
  add column if not exists start_date date,
  add column if not exists target_date date;

create index if not exists idx_projects_approval on projects (org_id, approval_status);

-- ─────────────────────────────────────────────────────────────────────────
-- Issues: category, lineage, timeline, effort, resolution notes
-- ─────────────────────────────────────────────────────────────────────────

alter table issues
  add column if not exists category ticket_category,
  add column if not exists parent_ticket_id uuid references issues (id) on delete cascade,
  add column if not exists start_date date,
  add column if not exists estimated_hours numeric(6, 2),
  add column if not exists resolution_note text;

-- Tickets raised before categories existed land in 'other'.
update issues set category = 'other' where type = 'ticket' and category is null;

-- Every task must trace back to a ticket. Pre-existing tasks have no origin,
-- so adopt them: parent them to the board's oldest ticket, or to one root
-- ticket created per board when the board has none. Doing this before the
-- constraint goes on means it can be added already-valid.
do $$
declare
  r record;
  v_ticket uuid;
  v_column uuid;
begin
  for r in
    select distinct project_id, org_id
    from public.issues
    where type <> 'ticket' and parent_ticket_id is null
  loop
    select id into v_ticket
      from public.issues
     where project_id = r.project_id and type = 'ticket'
     order by created_at
     limit 1;

    if v_ticket is null then
      select id into v_column
        from public.board_columns
       where project_id = r.project_id
       order by position
       limit 1;

      -- Unreachable in a consistent database: a work item's column_id is NOT
      -- NULL and references this project's board. Fail loudly here rather than
      -- letting it resurface as an opaque constraint violation further down.
      if v_column is null then
        raise exception
          'Project % has work items but no board columns, so no root ticket can be created for them',
          r.project_id;
      end if;

      insert into public.issues (org_id, project_id, column_id, type, category, title, description)
      values (
        r.org_id, r.project_id, v_column, 'ticket', 'other',
        'Existing work items',
        'Root ticket created automatically so work items that predate ticket tracking have a traceable origin.'
      )
      returning id into v_ticket;
    end if;

    update public.issues
       set parent_ticket_id = v_ticket
     where project_id = r.project_id
       and type <> 'ticket'
       and parent_ticket_id is null;
  end loop;
end $$;

alter table issues drop constraint if exists issues_task_has_root_ticket;
alter table issues add constraint issues_task_has_root_ticket
  check (type = 'ticket' or parent_ticket_id is not null);

-- A ticket cannot be its own parent.
alter table issues drop constraint if exists issues_parent_not_self;
alter table issues add constraint issues_parent_not_self
  check (parent_ticket_id is null or parent_ticket_id <> id);

create index if not exists idx_issues_parent_ticket on issues (parent_ticket_id);
create index if not exists idx_issues_due on issues (org_id, due_date) where due_date is not null;
create index if not exists idx_issues_assignee_due on issues (assignee_id, due_date);
create index if not exists idx_issues_resolved on issues (org_id, resolved_at) where resolved_at is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- Profiles: weekly capacity, used to read the weekly plan as load vs. headroom
-- ─────────────────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists weekly_capacity_hours numeric(5, 2) not null default 40;

-- ─────────────────────────────────────────────────────────────────────────
-- Who may create and change what
-- ─────────────────────────────────────────────────────────────────────────

-- Clients raise tickets, never tasks. Staff raise both. Combined with the
-- issues_task_has_root_ticket constraint this makes "only staff create work
-- items, and only off the back of a ticket" a database guarantee rather than
-- a UI convention — Server Functions are reachable by direct POST.
drop policy if exists issues_insert on issues;
create policy issues_insert on issues for insert with check (
  is_staff(auth.uid())
  or (is_org_member(auth.uid(), org_id) and type = 'ticket')
);

-- Triage (status, assignee, dates, priority) is staff work. Clients follow
-- their tickets by reading and commenting; the board is read-only to them.
drop policy if exists issues_update on issues;
create policy issues_update on issues for update using (is_staff(auth.uid()));

drop policy if exists issues_delete on issues;
create policy issues_delete on issues for delete using (is_staff(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- Project approval
-- ─────────────────────────────────────────────────────────────────────────

-- Any member of the client org can sign off on a project their departments
-- can see. Routed through a SECURITY DEFINER function rather than a broad
-- UPDATE policy so approving grants exactly that — it can't be used to
-- rename a project or move its dates.
create or replace function decide_project(
  p_project uuid,
  p_approve boolean,
  p_note text default null
) returns void as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then
    raise exception 'Project not found';
  end if;

  if not (is_staff(auth.uid()) or is_org_member(auth.uid(), v_org)) then
    raise exception 'Not allowed to decide on this project';
  end if;

  update public.projects
     set approval_status = (case when p_approve then 'approved' else 'rejected' end)::approval_status,
         decided_by      = auth.uid(),
         decided_at      = now(),
         decision_note   = nullif(btrim(coalesce(p_note, '')), ''),
         -- Approving starts the project; rejecting parks it without deleting it.
         status          = (case when p_approve then 'active' else 'on_hold' end)::project_status
   where id = p_project;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function decide_project(uuid, boolean, text) from public;
grant execute on function decide_project(uuid, boolean, text) to authenticated;
