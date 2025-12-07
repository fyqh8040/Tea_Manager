
import { Pool } from 'pg';

// 复用连接池逻辑
let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

export default async function handler(req, res) {
  const { method } = req;
  const { action, table, id } = req.query;

  try {
    const db = getPool();

    // --- GET Requests ---
    if (method === 'GET') {
      if (action === 'get_logs') {
        const result = await db.query(
          'SELECT * FROM public.inventory_logs WHERE item_id = $1 ORDER BY created_at DESC',
          [id]
        );
        return res.status(200).json({ data: result.rows });
      } 
      else {
        const result = await db.query(
          'SELECT * FROM public.tea_items ORDER BY created_at DESC'
        );
        return res.status(200).json({ data: result.rows });
      }
    }

    // --- POST Requests ---
    if (method === 'POST') {
      const body = req.body;
      const op = body.action || 'create';

      // 1. Delete
      if (op === 'delete') {
        await db.query('DELETE FROM public.tea_items WHERE id = $1', [body.id]);
        return res.status(200).json({ success: true });
      }

      // 2. Create / Update
      if (op === 'create' || op === 'update') {
        const itemData = body.data;
        // 定义通用字段
        const commonFields = ['name', 'type', 'category', 'year', 'origin', 'description', 'image_url', 'quantity'];
        
        if (op === 'update') {
          // Update: 仅更新通用字段
          const setClause = commonFields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
          const values = [body.id, ...commonFields.map(f => itemData[f])];
          
          const result = await db.query(
            `UPDATE public.tea_items SET ${setClause} WHERE id = $1 RETURNING *`,
            values
          );
          return res.status(200).json({ data: result.rows[0] });
        } 
        else {
          // Create: 包含 created_at，并使用事务
          const client = await db.connect();
          try {
            await client.query('BEGIN');

            const allFields = [...commonFields, 'created_at'];
            const cols = allFields.map(f => `"${f}"`).join(', ');
            const placeholders = allFields.map((_, i) => `$${i + 1}`).join(', ');
            const values = allFields.map(f => itemData[f]);
            
            const result = await client.query(
              `INSERT INTO public.tea_items (${cols}) VALUES (${placeholders}) RETURNING *`,
              values
            );
            
            const newItem = result.rows[0];
            
            // 自动写入初始库存日志
            if (newItem && newItem.quantity > 0) {
               await client.query(
                 `INSERT INTO public.inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                 [newItem.id, newItem.quantity, newItem.quantity, 'INITIAL', '初始入库', Date.now()]
               );
            }

            await client.query('COMMIT');
            return res.status(200).json({ data: newItem });
          } catch (e) {
            await client.query('ROLLBACK');
            throw e;
          } finally {
            client.release();
          }
        }
      }

      // 3. Stock Update (Transaction)
      if (op === 'stock_update') {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          await client.query(
            `INSERT INTO public.inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [body.id, body.changeAmount, body.newQuantity, body.reason, body.note, Date.now()]
          );
          
          const result = await client.query(
            `UPDATE public.tea_items SET quantity = $1 WHERE id = $2 RETURNING *`,
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
