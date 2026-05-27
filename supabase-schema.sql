-- Run this in Supabase SQL Editor
-- Drop old table if it exists (will lose any existing data)
drop table if exists waitlist_leads;

create table waitlist_leads (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now() not null,
  contact_name  text not null,
  school_name   text not null,
  whatsapp      text not null,
  student_count text not null  -- e.g. "Under 200", "200–500", "500–1,000", "Over 1,000"
);

-- Enable Row Level Security
alter table waitlist_leads enable row level security;

-- Allow anonymous inserts (form submissions from the public site)
create policy "Allow public inserts"
  on waitlist_leads for insert
  to anon
  with check (true);

-- Only authenticated users (your team) can read leads
create policy "Allow authenticated reads"
  on waitlist_leads for select
  to authenticated
  using (true);
