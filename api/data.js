
import { Pool } from 'pg';

// 复用连接池逻辑，防止 Serverless Function 频繁创建连接耗尽资源
let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // 大多数云数据库需要 SSL
    });
  }
  return pool;
}

export default async function handler(req, res) {
  const { method } = req;
  const { action, table, id } = req.query; // 用于 GET 请求区分

  try {
    const db = getPool();

    // --- GET Requests (Read) ---
    if (method === 'GET') {
      if (action === 'get_logs') {
        const result = await db.query(
          'SELECT * FROM inventory_logs WHERE item_id = $1 ORDER BY created_at DESC',
          [id]
        );
        return res.status(200).json({ data: result.rows });
      } 
      else {
        // Default: List Items
        const result = await db.query(
          'SELECT * FROM tea_items ORDER BY created_at DESC'
        );
        return res.status(200).json({ data: result.rows });
      }
    }

    // --- POST Requests (Write: Create, Update, Delete, Stock) ---
    if (method === 'POST') {
      const body = req.body;
      const op = body.action || 'create';

      if (op === 'delete') {
        await db.query('DELETE FROM tea_items WHERE id = $1', [body.id]);
        return res.status(200).json({ success: true });
      }

      if (op === 'create' || op === 'update') {
        const itemData = body.data;
        // 简单的字段映射，生产环境可以用 ORM
        const fields = ['name', 'type', 'category', 'year', 'origin', 'description', 'image_url', 'quantity', 'created_at'];
        
        if (op === 'update') {
          // 构建 Update SQL
          const setClause = fields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
          const values = [body.id, ...fields.map(f => itemData[f])];
          
          const result = await db.query(
            `UPDATE tea_items SET ${setClause} WHERE id = $1 RETURNING *`,
            values
          );
          return res.status(200).json({ data: result.rows[0] });
        } 
        else {
          // 构建 Insert SQL
          const cols = fields.map(f => `"${f}"`).join(', ');
          const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
          const values = fields.map(f => itemData[f]);
          
          const result = await db.query(
            `INSERT INTO tea_items (${cols}) VALUES (${placeholders}) RETURNING *`,
            values
          );
          
          // 如果是新建，且有初始库存，自动写入日志
          const newItem = result.rows[0];
          if (newItem && newItem.quantity > 0) {
             await db.query(
               `INSERT INTO inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
               [newItem.id, newItem.quantity, newItem.quantity, 'INITIAL', '初始入库', Date.now()]
             );
          }
          
          return res.status(200).json({ data: newItem });
        }
      }

      if (op === 'stock_update') {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // 1. Insert Log
          await client.query(
            `INSERT INTO inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [body.id, body.changeAmount, body.newQuantity, body.reason, body.note, Date.now()]
          );
          
          // 2. Update Item Quantity
          const result = await client.query(
            `UPDATE tea_items SET quantity = $1 WHERE id = $2 RETURNING *`,
            [body.newQuantity, body.id]
          );
          
          await client.query('COMMIT');
          return res.status(200).json({ data: result.rows[0] });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
