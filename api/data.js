
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// 复用连接池逻辑
let pool;
const JWT_SECRET = process.env.JWT_SECRET || 'tea-collection-secret-key-change-in-prod';

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

// 简单鉴权帮助函数
const getUserFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try {
        const token = authHeader.replace('Bearer ', '');
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
};

export default async function handler(req, res) {
  const { method } = req;
  const { action, table, id } = req.query;

  // 1. 鉴权
  const user = getUserFromRequest(req);
  if (!user) {
      return res.status(401).json({ error: '未登录或会话已过期' });
  }

  try {
    const db = getPool();

    // --- GET Requests ---
    if (method === 'GET') {
      if (action === 'get_logs') {
        // Logs 关联到 Item，Item 关联到 User。需要确保 Item 属于 User。
        const result = await db.query(
          `SELECT l.* FROM public.inventory_logs l 
           JOIN public.tea_items t ON l.item_id = t.id 
           WHERE t.id = $1 AND t.user_id = $2 
           ORDER BY l.created_at DESC`,
          [id, user.id]
        );
        return res.status(200).json({ data: result.rows });
      } 
      else {
        // List items (Filtered by User)
        const result = await db.query(
          'SELECT * FROM public.tea_items WHERE user_id = $1 ORDER BY created_at DESC',
          [user.id]
        );
        return res.status(200).json({ data: result.rows });
      }
    }

    // --- POST Requests ---
    if (method === 'POST') {
      const body = req.body;
      const op = body.action || 'create';

      // 1. Delete (Ensure ownership)
      if (op === 'delete') {
        const result = await db.query('DELETE FROM public.tea_items WHERE id = $1 AND user_id = $2', [body.id, user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found or unauthorized' });
        return res.status(200).json({ success: true });
      }

      // 2. Create / Update
      if (op === 'create' || op === 'update') {
        const itemData = body.data;
        let computedUnitPrice = 0;
        const qty = parseFloat(itemData.quantity);
        const totalPrice = parseFloat(itemData.price);
        if (qty > 0 && totalPrice >= 0) {
            computedUnitPrice = totalPrice / qty;
        }

        const commonFields = ['name', 'type', 'category', 'year', 'origin', 'description', 'image_url', 'quantity', 'unit', 'price', 'unit_price'];
        const dataToSave = { ...itemData, unit_price: computedUnitPrice };

        if (op === 'update') {
          // Update (Ensure ownership)
          const setClause = commonFields.map((f, i) => `"${f}" = $${i + 3}`).join(', '); // params start from 3
          const values = [body.id, user.id, ...commonFields.map(f => dataToSave[f])];
          
          const result = await db.query(
            `UPDATE public.tea_items SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
            values
          );
          
          if (result.rows.length === 0) return res.status(404).json({ error: 'Update failed or unauthorized' });
          return res.status(200).json({ data: result.rows[0] });
        } 
        else {
          // Create (Insert user_id)
          const client = await db.connect();
          try {
            await client.query('BEGIN');

            const allFields = ['user_id', ...commonFields, 'created_at'];
            const cols = allFields.map(f => `"${f}"`).join(', ');
            const placeholders = allFields.map((_, i) => `$${i + 1}`).join(', ');
            const values = [user.id, ...commonFields.map(f => dataToSave[f]), Date.now()];
            
            const result = await client.query(
              `INSERT INTO public.tea_items (${cols}) VALUES (${placeholders}) RETURNING *`,
              values
            );
            
            const newItem = result.rows[0];
            
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

      // 3. Stock Update (Ensure ownership)
      if (op === 'stock_update') {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // Check item ownership
          const itemRes = await client.query('SELECT * FROM public.tea_items WHERE id = $1 AND user_id = $2', [body.id, user.id]);
          if (itemRes.rows.length === 0) throw new Error('Item not found or unauthorized');
          const item = itemRes.rows[0];

          let unitPrice = parseFloat(item.unit_price);
          if (!unitPrice || unitPrice === 0) {
              const currentQty = parseFloat(item.quantity);
              const currentPrice = parseFloat(item.price);
              if (currentQty > 0) {
                  unitPrice = currentPrice / currentQty;
              }
          }

          const newQuantity = parseFloat(body.newQuantity);
          const newTotalPrice = newQuantity * unitPrice;

          await client.query(
            `INSERT INTO public.inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [body.id, body.changeAmount, newQuantity, body.reason, body.note, Date.now()]
          );
          
          const result = await client.query(
            `UPDATE public.tea_items SET quantity = $1, price = $2, unit_price = $3 WHERE id = $4 RETURNING *`,
            [newQuantity, newTotalPrice, unitPrice, body.id]
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
