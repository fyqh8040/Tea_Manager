
# 茶韵典藏 (Tea Collection Manager)

一个基于 Next.js 和 Supabase 的现代化藏品管理系统，专为茶叶与茶器爱好者打造。支持云端数据同步、图片上传及多维度的藏品检索。

## 🌟 核心特性

- **云端同步**: 基于 Supabase (PostgreSQL) 的实时数据存储。
- **一键初始化**: 支持通过 Connection String 自动完成数据库建表 (New)。
- **库存管理**: 记录每一次购入、品饮、赠予的流水，清晰掌握资产状况。
- **图床集成**: 支持自定义图片上传 API (默认兼容 cfbed/telegraph 格式)。
- **优雅交互**: 响应式设计，支持瀑布流展示与沉浸式详情查看。

## 🛠️ 技术栈

- **前端**: React 18, Tailwind CSS, Lucide Icons
- **后端/数据库**: Supabase (BaaS), Node.js (API Routes)
- **部署**: Vercel

## ⚙️ 环境变量配置

请在 Vercel 或本地 `.env.local` 中配置以下变量。

### 1. 基础配置 (必须)
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 项目 API URL | `https://xyz...supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开匿名密钥 | `eyJhbGciOiJIUzI...` |

### 2. 数据库初始化配置 (New, 可选)
如果想使用“一键初始化”功能，必须配置此项。

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `DATABASE_URL` | 数据库连接字符串 | Supabase Dashboard -> Settings -> Database -> Connection String (URI) -> 推荐使用 Transaction Mode (端口 6543) |

> ⚠️ **安全警告**: `DATABASE_URL` 包含敏感密码，**绝不要**以 `NEXT_PUBLIC_` 开头，仅限服务端使用。

## 🚀 部署指南 (Vercel)

1. **安装依赖**:
   本项目新增了服务端迁移功能，需要安装 `pg` 库。
   ```bash
   npm install pg
   ```

2. **配置 Vercel**:
   - 导入项目。
   - 在 Environment Variables 中填入 `NEXT_PUBLIC_` 开头的变量。
   - (推荐) 填入 `DATABASE_URL` 以启用自动建表功能。

3. **初始化数据库**:
   - 部署完成后打开网页。
   - 如果数据库为空，页面会弹出提示向导。
   - 点击“立即执行初始化”按钮即可自动完成建表。

## 🗄️ 手动数据库初始化

如果不想配置 `DATABASE_URL`，可在 Supabase 的 **SQL Editor** 中运行以下 SQL：

```sql
-- 1. 基础表结构
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

-- 2. 库存日志表
create table if not exists inventory_logs (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references tea_items(id) on delete cascade,
  change_amount integer not null, 
  current_balance integer not null, 
  reason text not null, 
  note text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 3. 权限设置
alter table tea_items enable row level security;
create policy "Public Access Tea Items" on tea_items for all using (true);

alter table inventory_logs enable row level security;
create policy "Public Access Inventory Logs" on inventory_logs for all using (true);
```
