-- Optional usage analytics table for ShortlistAI.
-- Stores ONLY anonymous aggregates - never resume text or personal data.
create table if not exists public.screenings (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  job_title     text not null,
  candidate_count int not null,
  top_score     int not null,
  mode          text not null check (mode in ('live', 'demo')),
  model         text not null,
  duration_ms   int not null,
  success       boolean not null,
  error_status  int
);

-- Lock the table down: only the server (service role key) can write; nobody can read via the public API.
alter table public.screenings enable row level security;
