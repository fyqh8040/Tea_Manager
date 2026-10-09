
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
*   **图床支持**：默认支持 Base64 数据库存储，同时兼容 [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) 等外部图床 API。
*   **移动端适配**：完美适配手机与桌面端，随时随地查看藏品。

---

## 🛠️ 技术栈

*   **前端**: React 18, Tailwind CSS, Lucide React (图标), Vite
*   **后端**: Node.js Serverless Functions (API Routes)
*   **数据库**: PostgreSQL (Supabase / Neon)
*   **连接方式**: 
    *   ✅ **Connection Pooling (推荐)**: 使用 `pg` 库直连，支持自动化建表与事务管理。
*   **鉴权**: JWT (JSON Web Token) + BCrypt 加密

---

## 🚀 部署指南

本项目推荐使用 **Vercel** 及其内置的 **Neon Serverless PostgreSQL (免费版)** 进行极简免运维部署。

### 第一步：在 Vercel 中一键绑定 Neon 数据库

1. 登录 [Vercel](https://vercel.com)，进入本项目控制台。
2. 点击顶部导航栏的 **Storage**。
3. 点击 **Create Storage**，选择 **Neon (PostgreSQL)**。
4. 创建完成后，Vercel 会自动为项目注入环境变量（包括 `POSTGRES_URL`、`DATABASE_URL`、`PGHOST` 等）。
5. **注意**：如果环境变量右侧显示黄色的 **`Needs Attention`** 标识，代表需要进行一次 **Redeploy（重新部署）** 使得新绑定的数据库变量生效。

### 第二步：配置环境变量

在 **Project Settings** -> **Environment Variables** 中核对以下变量：

| 变量名 | 必填 | 说明 |
| :--- | :---: | :--- |
| `POSTGRES_URL` / `DATABASE_URL` | ✅ | **核心配置 (Neon 自动注入)**：PostgreSQL 连接字符串。代码已支持自动智能识别。 |
| `JWT_SECRET` | ✅ | **安全配置**：Token 加密密钥。生产环境请务必设置。 |
| `NEXT_PUBLIC_IMAGE_API_URL` | 可选 | 图床上传接口地址 (例如：`https://cfbed.xxx.xyz/`) |
| `NEXT_PUBLIC_IMAGE_API_TOKEN` | 可选 | 图床上传 Token |

### 第三步：一键初始化数据库

1. 打开部署好的网站域名。
2. **首次登录**：使用默认管理员账号。
   * 用户名: `admin`
   * 密码: `admin`
3. 登录后，若弹出 **“数据库尚未初始化”** 提示，点击 **“打开初始化向导”** -> **“开始初始化 / 修复”**。
4. 系统将自动在 Neon 数据库中执行建表与迁移。完成后刷新页面即可开始使用！

---

## 🛡️ 使用说明

### 账号管理
*   **修改密码**：首次登录后，请务必立即在“设置”中修改 `admin` 的默认密码。
*   **创建用户**：作为管理员，你可以在“设置 -> 用户管理”中为家人或朋友创建独立的账号。

### 常见问题
*   **Q: 初始化失败，提示 "password authentication failed"？**
    *   A: 检查 `DATABASE_URL` 中的密码是否正确。注意：Supabase 的数据库密码**不是**你的登录密码，而是创建 Project 时设置的那个。
*   **Q: 图片存在哪？**
    *   A: 默认存入 PostgreSQL 数据库。配置了 `NEXT_PUBLIC_IMAGE_API_URL` 后可支持外部图床。

---

## ❤️ 鸣谢

本项目的部分灵感与技术实现得益于开源社区的无私贡献，特别感谢：

*   **[CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)**: 开源图床方案。

---

## 📄 开源协议

MIT License

Copyright (c) 2024 Tea Collection Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
