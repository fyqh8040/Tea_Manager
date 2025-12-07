
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
  quantity integer default 1,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 2. 设置 tea_items 权限
alter table public.tea_items enable row level security;
drop policy if exists "Public Access Tea Items" on public.tea_items;
create policy "Public Access Tea Items" on public.tea_items for all using (true);

-- 3. 创建库存流水表 (注意外键引用也要加 public)
create table if not exists public.inventory_logs (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.tea_items(id) on delete cascade,
  change_amount integer not null, 
  current_balance integer not null, 
  reason text not null, 
  note text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 4. 设置 inventory_logs 权限
alter table public.inventory_logs enable row level security;
drop policy if exists "Public Access Inventory Logs" on public.inventory_logs;
create policy "Public Access Inventory Logs" on public.inventory_logs for all using (true);
`;
