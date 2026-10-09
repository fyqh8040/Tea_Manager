import { Pool } from 'pg';

let pool = null;

/**
 * 获取可用的 PostgreSQL 连接字符串或配置对象
 * 完美适配 Vercel + Neon 自动注入的环境变量 (POSTGRES_URL, DATABASE_URL 等)
 */
export function getDatabaseConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

export function hasDatabaseConfigured() {
  if (getDatabaseConnectionString()) return true;
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE) return true;
  return false;
}

export function getPool() {
  if (!pool) {
    const connectionString = getDatabaseConnectionString();

    if (connectionString) {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10
      });
    } else if (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE) {
      // 兼容 Vercel 分离注入的 PGHOST / PGUSER / PGPASSWORD / PGDATABASE
      pool = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
        database: process.env.PGDATABASE || process.env.POSTGRES_DATABASE,
        port: Number(process.env.PGPORT) || 5432,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10
      });
    } else {
      throw new Error(
        '未检测到数据库连接配置。请确认 Vercel 环境变量中已注入 DATABASE_URL 或 POSTGRES_URL (Neon)'
      );
    }

    // 监听池错误，避免未捕获异常导致进程退出
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client (Neon):', err);
    });
  }

  return pool;
}
