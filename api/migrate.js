
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
      ssl: { rejectUnauthorized: false } 
    });
    
    client = await pool.connect();

    // 3. 执行 SQL (拆分语句逐条执行，提高稳定性)
    console.log('Starting migration...');
    
    // 移除注释并按分号拆分
    const statements = SCHEMA_SQL
      .replace(/--.*$/gm, '') // 移除单行注释
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0); // 过滤空语句

    for (const statement of statements) {
      // console.log('Executing:', statement); // Debug usage
      await client.query(statement);
    }

    console.log('Migration completed successfully.');
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
