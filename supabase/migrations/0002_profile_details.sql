-- Adds personal-details fields to profiles (phone, title, location, bio),
-- shown/editable on the Account page.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists location text,
  add column if not exists bio text;
