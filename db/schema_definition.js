
export const SCHEMA_SQL = `
-- 茶韵典藏 数据库初始化脚本
-- 请复制以下所有内容到 Supabase -> SQL Editor -> New Query 中运行

-- 1. 创建核心藏品表
create table if not exists tea_items (
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

-- 2. 开启行级安全策略 (允许公开读写，生产环境请按需收紧)
alter table tea_items enable row level security;
create policy "Public Access Tea Items" on tea_items for all using (true);

-- 3. 创建库存流水表
create table if not exists inventory_logs (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references tea_items(id) on delete cascade,
  change_amount integer not null, 
  current_balance integer not null, 
  reason text not null, 
  note text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 4. 开启流水表权限
alter table inventory_logs enable row level security;
create policy "Public Access Inventory Logs" on inventory_logs for all using (true);
`;
