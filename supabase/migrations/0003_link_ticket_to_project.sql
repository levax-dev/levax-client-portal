-- Lets staff associate a support ticket with a broader (non-support) project
-- for context/tracking, without moving the ticket off the support board.
alter table public.issues
  add column if not exists linked_project_id uuid references public.projects (id) on delete set null;

create index if not exists idx_issues_linked_project on public.issues (linked_project_id);
