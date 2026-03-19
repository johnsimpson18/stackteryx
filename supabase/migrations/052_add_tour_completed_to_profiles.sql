alter table public.profiles
  add column if not exists tour_completed boolean default false,
  add column if not exists tour_completed_at timestamptz;
