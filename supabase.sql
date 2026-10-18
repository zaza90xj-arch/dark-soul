-- DARK SOUL — مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- الخطوات: Supabase ← SQL Editor ← New query ← الصق الملف كله ← Run
-- الأمان: كل الجداول مقفلة (RLS مفعّل بلا سياسات) والمتصفح لا يصل إليها مباشرة؛
-- الوصول يتم فقط عبر api/app.js بمفتاح الخدمة السري الموجود في متغيرات Vercel.

create extension if not exists pgcrypto;

-- ===== الملفات الشخصية والصلاحيات =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nick text not null default '' check (char_length(nick) <= 30),
  avatar text not null default '🌑',
  role text not null default 'user' check (role in ('user','mod','admin')),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, nick) values (new.id, left(coalesce(new.raw_user_meta_data->>'nick',''), 30))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== المحتوى (بوستات، برومبتات، قصص، اقتباسات) =====
create table if not exists public.content (
  id text primary key default ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  kind text not null check (kind in ('post','prompt','story','quote')),
  cat text, sub text, dial text check (dial in ('eg','ar')),
  lang text, tool text, genre text,
  title text not null default '',
  descr text not null default '',
  body text not null check (char_length(body) between 1 and 6000),
  featured boolean not null default false,
  status text not null default 'published' check (status in ('published','pending','hidden','scheduled')),
  publish_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists content_status_idx on public.content(status, kind);

-- ===== المفضلة والإعدادات =====
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  kind text not null check (kind in ('post','prompt')),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- ===== المجتمع =====
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'مجهول',
  body text not null check (char_length(body) between 10 and 800),
  status text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists cposts_idx on public.community_posts(status, created_at desc);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'مجهول',
  body text not null check (char_length(body) between 2 and 300),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  reporter uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','abuse','selfharm','other')),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter)
);

-- ===== إعدادات الموقع =====
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null
);
insert into public.site_settings(key, value) values
  ('welcome', to_jsonb('أهلًا بك في عالم DARK SOUL... هنا للكلمات مكان، وللمشاعر صوت، ولكل حكاية مساحة.'::text)),
  ('logo_text', to_jsonb('DARK SOUL'::text)),
  ('default_color', to_jsonb('auto'::text)),
  ('community_enabled', 'false'::jsonb),
  ('community_premod', 'true'::jsonb),
  ('seed_imported', 'false'::jsonb),
  ('promo', '{"enabled":false,"text":"","link":""}'::jsonb),
  ('custom_cats', '{"sub":{},"pcat":{}}'::jsonb)
on conflict (key) do nothing;

-- ===== الإحصائيات (بلا أي بيانات شخصية) =====
create table if not exists public.events (
  id bigserial primary key,
  day date not null default current_date,
  type text not null check (type in ('view','copy','like','fav')),
  item_id text not null
);
create index if not exists events_idx on public.events(day, type);

create or replace view public.trending as
  select item_id,
         sum(case type when 'copy' then 1 when 'like' then 2 when 'fav' then 3 else 0 end)::int as score,
         count(*) filter (where type = 'view')::int as views
  from public.events where day > current_date - 30 group by item_id;

create or replace view public.stats_daily as
  select day, type, count(*)::int as n from public.events group by day, type;

-- ===== قفل الجداول: لا وصول مباشر من المتصفح =====
alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.favorites enable row level security;
alter table public.user_settings enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.site_settings enable row level security;
alter table public.events enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ===== جعل حسابك مديرًا (بعد أن تسجّل حسابًا من الموقع) =====
-- غيّر البريد ثم شغّل هذا السطر وحده:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'ضع-بريدك-هنا');
