-- Run this in Supabase SQL Editor to create the waitlist leads table

create table if not exists waitlist_leads (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now() not null,
  school_name   text not null,
  contact_name  text not null,
  role          text not null check (role in ('Director', 'Head Teacher', 'Academic Registrar', 'Other')),
  student_count integer not null check (student_count > 0),
  whatsapp      text not null,
  email         text not null
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
