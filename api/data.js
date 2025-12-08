
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
        // 计算 unit_price (单价 = 总价 / 数量)
        // 如果用户没填 quantity 或 quantity 为 0，避免除以零
        let computedUnitPrice = 0;
        const qty = parseFloat(itemData.quantity);
        const totalPrice = parseFloat(itemData.price);
        if (qty > 0 && totalPrice >= 0) {
            computedUnitPrice = totalPrice / qty;
        }

        // 定义字段 (包含 unit_price)
        const commonFields = ['name', 'type', 'category', 'year', 'origin', 'description', 'image_url', 'quantity', 'unit', 'price', 'unit_price'];
        // 将计算出的 unit_price 注入数据
        const dataToSave = { ...itemData, unit_price: computedUnitPrice };

        if (op === 'update') {
          // Update
          const setClause = commonFields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
          const values = [body.id, ...commonFields.map(f => dataToSave[f])];
          
          const result = await db.query(
            `UPDATE public.tea_items SET ${setClause} WHERE id = $1 RETURNING *`,
            values
          );
          return res.status(200).json({ data: result.rows[0] });
        } 
        else {
          // Create
          const client = await db.connect();
          try {
            await client.query('BEGIN');

            const allFields = [...commonFields, 'created_at'];
            const cols = allFields.map(f => `"${f}"`).join(', ');
            const placeholders = allFields.map((_, i) => `$${i + 1}`).join(', ');
            const values = allFields.map(f => f === 'created_at' ? Date.now() : dataToSave[f]);
            
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

      // 3. Stock Update (Transaction) with AUTO VALUATION ADJUSTMENT
      if (op === 'stock_update') {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          // 1. 获取当前商品信息以计算单价
          const itemRes = await client.query('SELECT * FROM public.tea_items WHERE id = $1', [body.id]);
          if (itemRes.rows.length === 0) throw new Error('Item not found');
          const item = itemRes.rows[0];

          // 2. 确定单价：优先使用存储的 unit_price，如果没有则根据 当前总价/当前数量 计算
          let unitPrice = parseFloat(item.unit_price);
          if (!unitPrice || unitPrice === 0) {
              const currentQty = parseFloat(item.quantity);
              const currentPrice = parseFloat(item.price);
              if (currentQty > 0) {
                  unitPrice = currentPrice / currentQty;
              }
          }

          // 3. 计算新的总价
          const newQuantity = parseFloat(body.newQuantity);
          const newTotalPrice = newQuantity * unitPrice;

          // 4. 写入日志
          await client.query(
            `INSERT INTO public.inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [body.id, body.changeAmount, newQuantity, body.reason, body.note, Date.now()]
          );
          
          // 5. 更新商品库存 AND 总价
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
