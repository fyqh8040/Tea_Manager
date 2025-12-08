
export const SCHEMA_SQL = `
-- 茶韵典藏 数据库初始化脚本
-- 显式指定 schema 为 public，防止搜索路径问题

-- 1. 创建核心藏品表
create table if not exists public.tea_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null, 
  category text,
  year text,
  origin text,
  description text,
  image_url text,
  quantity numeric default 1,
  unit text default '件',
  price numeric default 0,    -- 新增价格/估值字段
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 补丁: 针对旧版本数据库，强制检查并补充缺失字段 (Schema Migration)
alter table public.tea_items add column if not exists quantity numeric default 1;
alter table public.tea_items add column if not exists created_at bigint default (extract(epoch from now()) * 1000)::bigint;
alter table public.tea_items add column if not exists unit text default '件';
alter table public.tea_items add column if not exists price numeric default 0; -- 补丁：新增价格

-- 补丁: 升级数量字段为小数类型 (Numeric) 以支持克重或拆饼消耗
alter table public.tea_items alter column quantity type numeric;
alter table public.tea_items alter column price type numeric;

-- 2. 设置 tea_items 权限
alter table public.tea_items enable row level security;
drop policy if exists "Public Access Tea Items" on public.tea_items;
create policy "Public Access Tea Items" on public.tea_items for all using (true);

-- 3. 创建库存流水表
create table if not exists public.inventory_logs (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.tea_items(id) on delete cascade,
  change_amount numeric not null, -- 修改为 numeric
  current_balance numeric not null, -- 修改为 numeric
  reason text not null, 
  note text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 补丁: 升级日志表字段类型
alter table public.inventory_logs alter column change_amount type numeric;
alter table public.inventory_logs alter column current_balance type numeric;

-- 4. 设置 inventory_logs 权限
alter table public.inventory_logs enable row level security;
drop policy if exists "Public Access Inventory Logs" on public.inventory_logs;
create policy "Public Access Inventory Logs" on public.inventory_logs for all using (true);
`;
