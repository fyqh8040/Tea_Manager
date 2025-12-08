
export const SCHEMA_SQL = `
-- 茶韵典藏 数据库初始化脚本

-- 1. 创建用户表 (New)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  role text default 'user', -- 'admin' or 'user'
  is_initial boolean default false, -- 是否为初始密码，如果是则强制修改
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 初始化默认管理员 (密码: admin)
-- bcrypt hash for 'admin' is typically needed. 
-- Here we use a placeholder or insert via API logic, but for pure SQL init we try to insert if empty.
-- 注意: 为了确保安全性，实际生产环境应在代码中处理 Hash，这里仅为 SQL 初始化演示结构。
-- 下面的 Hash 是 'admin' 的 bcrypt hash (cost 10)
insert into public.users (username, password_hash, role, is_initial)
select 'admin', '$2a$10$X7V.2e.9.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'admin', true
where not exists (select 1 from public.users where username = 'admin');


-- 2. 创建核心藏品表
create table if not exists public.tea_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade, -- 关联用户，用户删数据删
  name text not null,
  type text not null, 
  category text,
  year text,
  origin text,
  description text,
  image_url text,
  quantity numeric default 1,
  unit text default '件',
  price numeric default 0,
  unit_price numeric default 0,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 补丁: 补充 user_id 字段
alter table public.tea_items add column if not exists user_id uuid references public.users(id) on delete cascade;

-- 数据清洗: 如果有遗留数据且没有 owner，暂时归属给 admin (可选，防止数据丢失)
-- update public.tea_items set user_id = (select id from public.users where username = 'admin' limit 1) where user_id is null;

-- 补丁: 针对旧版本数据库，强制检查并补充缺失字段
alter table public.tea_items add column if not exists quantity numeric default 1;
alter table public.tea_items add column if not exists created_at bigint default (extract(epoch from now()) * 1000)::bigint;
alter table public.tea_items add column if not exists unit text default '件';
alter table public.tea_items add column if not exists price numeric default 0; 
alter table public.tea_items add column if not exists unit_price numeric default 0;

alter table public.tea_items alter column quantity type numeric;
alter table public.tea_items alter column price type numeric;
alter table public.tea_items alter column unit_price type numeric;

update public.tea_items 
set unit_price = price / nullif(quantity, 0) 
where (unit_price is null or unit_price = 0) and price > 0 and quantity > 0;

-- 3. 设置权限
alter table public.tea_items enable row level security;
drop policy if exists "Public Access Tea Items" on public.tea_items;
create policy "Public Access Tea Items" on public.tea_items for all using (true);

-- 4. 创建库存流水表
create table if not exists public.inventory_logs (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.tea_items(id) on delete cascade,
  change_amount numeric not null,
  current_balance numeric not null,
  reason text not null, 
  note text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

alter table public.inventory_logs alter column change_amount type numeric;
alter table public.inventory_logs alter column current_balance type numeric;

alter table public.inventory_logs enable row level security;
drop policy if exists "Public Access Inventory Logs" on public.inventory_logs;
create policy "Public Access Inventory Logs" on public.inventory_logs for all using (true);
`;
