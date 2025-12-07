
# 茶韵典藏 (Tea Collection Manager)

一个基于 Next.js 和 Supabase 的现代化藏品管理系统，专为茶叶与茶器爱好者打造。支持云端数据同步、图片上传及多维度的藏品检索。

## 🌟 核心特性

- **云端同步**: 基于 Supabase (PostgreSQL) 的实时数据存储。
- **图床集成**: 支持自定义图片上传 API (默认兼容 cfbed/telegraph 格式)。
- **优雅交互**: 响应式设计，支持瀑布流展示与沉浸式详情查看。
- **隐私安全**: 敏感配置通过环境变量注入，前端不硬编码密钥。

## 🛠️ 技术栈

- **前端**: React 18, Tailwind CSS, Lucide Icons
- **后端/数据库**: Supabase (BaaS)
- **部署**: Vercel

## ⚙️ 环境变量配置 (关键)

在项目部署（如 Vercel）或本地运行时，请配置以下环境变量。这决定了应用连接哪个数据库和图床。

### 1. Supabase 数据库配置
请登录 [Supabase Dashboard](https://supabase.com/dashboard) -> 选择项目 -> **Settings** -> **API** 获取：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | 项目 API URL | `https://xyz...supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开匿名密钥 (anon public) | `eyJhbGciOiJIUzI...` |

> ⚠️ **注意**: 绝不要使用 `postgresql://` 格式的连接字符串，前端应用必须使用 API URL 和 Anon Key。

### 2. 图床配置 (可选)
如果不配置，将使用默认的公共图床或本地 Base64 存储（不推荐用于生产）。

| 变量名 | 说明 | 默认值/示例 |
|--------|------|-------------|
| `NEXT_PUBLIC_IMAGE_API_URL` | 图片上传接口地址 (POST) | `https://cfbed.sanyue.de/api/upload` |
| `NEXT_PUBLIC_IMAGE_API_TOKEN` | 上传 Token (如接口需要) | `你的Token` |

## 🚀 部署指南 (Vercel)

1. Fork 本仓库到你的 GitHub。
2. 登录 [Vercel](https://vercel.com)，点击 "Add New Project"。
3. 导入你的仓库。
4. 在 **Environment Variables** 区域，填入上述的 Supabase 变量。
5. 点击 **Deploy**。

## 🗄️ 数据库初始化

在 Supabase 的 **SQL Editor** 中运行以下命令以创建数据表：

```sql
create table tea_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null, 
  category text,
  year text,
  origin text,
  description text,
  image_url text,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 开启行级安全策略 (根据需求配置，测试期可设为 true)
alter table tea_items enable row level security;
create policy "Public Access" on tea_items for all using (true);
```

## 📝 开发说明

如果本地开发，请在项目根目录创建 `.env.local` 文件并填入上述变量。
