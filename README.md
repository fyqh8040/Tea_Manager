
# 🍃 茶韵典藏 (Tea Collection Manager)

> **一款专为茶友打造的现代化、私有化藏品管理系统。**

[![Deployed with Vercel](https://vercel.com/button)](https://vercel.com/new)

## 📖 项目简介

**茶韵典藏** 是一个全栈 Web 应用，旨在帮助茶叶爱好者和藏家数字化管理自己的库存。不同于通用的库存软件，它针对“茶”与“器”进行了专门的字段设计（如年份、产地、工艺），并提供了优雅的视觉体验。

本项目采用 **前后端分离** 架构，前端基于 React 18 打造沉浸式体验，后端通过 Serverless API (Node.js) 直接与 PostgreSQL 数据库交互，确保了数据的私密性与安全性。

### ✨ 核心功能

*   **双模式管理**：专门针对 **茶品**（消耗品，单位：克/饼等）与 **茶器**（固定资产，单位：件/套）设计的不同数据结构。
*   **库存流水追踪**：不仅仅是记录数量，还能记录每一次“品饮”、“购入”、“赠予”或“盘亏”的详细流水与备注。
*   **多用户体系**：
    *   **管理员**：拥有系统最高权限，可管理所有用户、修改任意昵称。
    *   **普通藏家**：拥有独立的数据空间，数据互不可见。
*   **全自动初始化**：利用后端直连数据库能力，内置迁移脚本，无需手动执行 SQL，通过界面即可一键修复/创建数据库表结构。
*   **智能联想**：输入产地或分类时提供智能补全（如：易武、景德镇、紫砂壶等）。
*   **移动端适配**：完美适配手机与桌面端，随时随地查看藏品。

---

## 🛠️ 技术栈

*   **前端**: React 18, Tailwind CSS, Lucide React (图标), Vite
*   **后端**: Node.js Serverless Functions (API Routes)
*   **数据库**: PostgreSQL (Supabase / Neon)
*   **连接方式**: 
    *   ✅ **Connection Pooling (推荐)**: 使用 `pg` 库直连，支持自动化建表与事务管理。
    *   ⚠️ **REST API (Supabase SDK)**: 传统的客户端 API 模式（本项目主要使用直连模式以支持高级功能）。
*   **鉴权**: JWT (JSON Web Token) + BCrypt 加密

---

## 🚀 部署指南

本项目推荐使用 **Vercel** 配合 **Supabase** 进行免费部署。

### 核心概念：为什么需要 Connection String？

Supabase 通常提供两种连接方式：
1.  **API URL + Key**：前端直接调用，**缺点**是需要你在 Supabase 后台手动运行 SQL 建表，且难以在代码中管理数据库变更。
2.  **Connection String (DATABASE_URL)**：后端直连数据库。**优点**是本项目可以通过代码**自动检测并创建数据表**，真正实现“零门槛部署”。

**因此，本项目强烈推荐配置 `DATABASE_URL`。**

### 第一步：准备数据库 (Supabase)

1.  注册并登录 [Supabase](https://supabase.com)。
2.  创建一个新项目 (New Project)。
3.  进入 **Project Settings** -> **Database**。
4.  找到 **Connection String** -> **URI**。
5.  **重要**：复制 Mode 为 `Transaction` (端口 6543) 的连接字符串。
    *   格式示例：`postgres://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres`
    *   *记得将 `[password]` 替换为你创建项目时设置的数据库密码。*

### 第二步：部署代码 (Vercel)

1.  Fork 本项目到你的 GitHub 仓库。
2.  登录 [Vercel](https://vercel.com)，点击 **Add New...** -> **Project**。
3.  导入你刚刚 Fork 的仓库。
4.  **关键步骤**：在 **Environment Variables** (环境变量) 中添加以下变量：

| 变量名 | 必填 | 说明 | 示例值 |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | ✅ | **核心配置**：PostgreSQL 连接字符串。用于后端 API 直连数据库，实现自动初始化和事务处理。 | `postgres://postgres:[PWD]@db.xxx.supabase.co:6543/postgres` |
| `JWT_SECRET` | ✅ | **安全配置**：用于加密 Token 的随机长字符串，请设置得复杂一些。 | `my-super-secret-key-123456` |
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ | (可选) 如果你想扩展使用 Supabase 的 Storage 或 Realtime 功能，可配置此项。核心功能不需要。 | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| ❌ | (可选) 同上。 | `eyJxh...` |

5.  点击 **Deploy** 等待部署完成。

### 第三步：一键初始化

1.  打开部署好的网站域名。
2.  **首次登录**：使用默认管理员账号。
    *   用户名: `admin`
    *   密码: `admin`
3.  登录后，系统会自动检测数据库结构。由于是新项目，界面会弹出 **红色警告“数据库未初始化”**。
4.  点击警告框中的 **“打开初始化向导”** -> **“立即修复”**。
5.  系统将利用 `DATABASE_URL` 自动运行迁移脚本，创建 `users`, `tea_items`, `inventory_logs` 等所有数据表。
6.  页面自动刷新，部署完成！

---

## 🛡️ 使用说明

### 账号管理
*   **修改密码**：首次登录后，请务必立即在“设置”中修改 `admin` 的默认密码。
*   **创建用户**：作为管理员，你可以在“设置 -> 用户管理”中为家人或朋友创建独立的账号。

### 常见问题
*   **Q: 初始化失败，提示 "password authentication failed"？**
    *   A: 检查 `DATABASE_URL` 中的密码是否正确。注意：Supabase 的数据库密码**不是**你的登录密码，而是创建 Project 时设置的那个。如果忘了，可以在 Supabase 后台重置。
*   **Q: 图片存在哪？**
    *   A: 为了保持部署简单，图片目前以 Base64 编码直接存储在 PostgreSQL 数据库中。适合个人轻量级使用。建议上传前适当压缩图片。
*   **Q: 我可以手动建表吗？**
    *   A: 可以，但没必要。如果你不配置 `DATABASE_URL` 而仅配置 API Key，由于后端 API 依赖 `pg` 连接池，系统将无法正常工作。请优先使用连接字符串方式。

---

## 🤝 贡献与致谢

本项目由 **全栈 UI 工程师** 与 **AI Assistant (Gemini)** 共同迭代开发。

*   架构设计与 UI 交互：全栈 UI 工程师
*   核心代码实现与自动化部署：AI Assistant

欢迎 Fork 本项目并提交 PR，共同完善这个小而美的藏品管理系统。

---

MIT License © 2024 Tea Collection
