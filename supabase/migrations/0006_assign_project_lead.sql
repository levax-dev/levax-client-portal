-- Project leads are assigned from the app rather than by hand in SQL.
--
-- Who may assign: a super admin, on any project; or a project's current lead,
-- handing their own project to someone else. Regular staff and clients cannot.
--
-- Being a lead is not cosmetic — it carries ticket triage on that board, the
-- team-tracking page, and visibility of everyone assigned work there. So the
-- rule is enforced in the database, not only in the Server Function: a broad
-- `projects_update` policy already lets any staff member PATCH a project row
-- through PostgREST, which would otherwise make the boundary advisory only.

-- ─────────────────────────────────────────────────────────────────────────
-- The assignment entry point
-- ─────────────────────────────────────────────────────────────────────────

create or replace function assign_project_lead(p_project uuid, p_lead uuid)
returns void as $$
declare
  v_current_lead uuid;
begin
  select lead_id into v_current_lead from public.projects where id = p_project;
  if not found then
    raise exception 'Project not found';
  end if;

  if not (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and platform_role = 'super_admin'
    )
    or (v_current_lead is not null and v_current_lead = auth.uid())
  ) then
    raise exception 'Only a super admin, or this project''s current lead, can assign its lead';
  end if;

  -- A lead runs delivery on the board, so it has to be one of our own people.
  if p_lead is not null and not exists (
    select 1 from public.profiles
    where id = p_lead and platform_role in ('staff', 'super_admin')
  ) then
    raise exception 'A project lead must be a Leverage Axiom staff member';
  end if;

  -- Tells the guard trigger below that this change came through the front door.
  perform set_config('app.assigning_project_lead', 'on', true);
  update public.projects set lead_id = p_lead where id = p_project;
  perform set_config('app.assigning_project_lead', 'off', true);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function assign_project_lead(uuid, uuid) from public;
grant execute on function assign_project_lead(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- The guard
-- ─────────────────────────────────────────────────────────────────────────

-- Column-level grants would also work, but they have to enumerate every other
-- column and would silently make any column added later un-updatable. A
-- trigger keyed on a transaction-local setting stays correct as the table
-- grows, and the setting can only be raised from inside the function above.
create or replace function guard_project_lead_change() returns trigger as $$
begin
  if new.lead_id is distinct from old.lead_id
     and coalesce(current_setting('app.assigning_project_lead', true), 'off') <> 'on' then
    raise exception
      'Change a project lead through assign_project_lead(), which checks who is allowed to';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_guard_project_lead on projects;
create trigger trg_guard_project_lead
  before update on projects
  for each row execute function guard_project_lead_change();

-- The guard also applies to the service-role key, which bypasses RLS but not
-- triggers, and to `assign_project_lead` itself when there is no signed-in user
-- to check. To repair a lead by hand — say every super admin has left — raise
-- the setting yourself in the same transaction:
--
--   begin;
--   select set_config('app.assigning_project_lead', 'on', true);
--   update public.projects set lead_id = '<profile-id>' where id = '<project-id>';
--   commit;
--
-- Seeding is unaffected: a project created with a lead sets it on INSERT, and
-- this trigger only fires on UPDATE.
