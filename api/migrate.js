import { Pool } from 'pg';
import { SCHEMA_SQL } from '../db/schema_definition.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 检查环境变量
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return res.status(500).json({ 
      error: 'Missing DATABASE_URL', 
      details: '请在 Vercel 环境变量中配置 DATABASE_URL (格式: postgres://user:pass@host:port/db)' 
    });
  }

  let client;
  try {
    // 2. 连接数据库
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false } // Supabase/Cloud DBs usually require SSL
    });
    
    client = await pool.connect();

    // 3. 执行 SQL (直接从模块导入，无需文件读取)
    console.log('Executing migration SQL...');
    await client.query(SCHEMA_SQL);

    return res.status(200).json({ success: true, message: 'Database schema initialized successfully' });

  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error.message 
    });
  } finally {
    if (client) client.release();
  }
}