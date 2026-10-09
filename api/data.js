
import jwt from 'jsonwebtoken';
import { getPool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tea-collection-secret-key-change-in-prod';

// 自动补齐品饮笔记表（防止旧数据库结构缺失时报错）
async function ensureTastingNotesTable(db) {
  try {
    await db.query(`
      create table if not exists public.tasting_notes (
        id uuid default gen_random_uuid() primary key,
        item_id uuid references public.tea_items(id) on delete cascade,
        user_id uuid references public.users(id) on delete cascade,
        rating numeric default 5,
        water_temp numeric,
        steep_seconds numeric,
        tea_amount numeric,
        ware_name text,
        soup_color text,
        flavor_tags text,
        notes text,
        created_at bigint default (extract(epoch from now()) * 1000)::bigint
      );
      alter table public.tasting_notes enable row level security;
      drop policy if exists "Public Access Tasting Notes" on public.tasting_notes;
      create policy "Public Access Tasting Notes" on public.tasting_notes for all using (true);
    `);
  } catch (e) {
    console.warn('ensureTastingNotesTable warning:', e.message);
  }
}

// 自动补齐藏品表新字段
async function ensureTeaItemsColumns(db) {
  try {
    await db.query(`
      alter table public.tea_items add column if not exists material text;
      alter table public.tea_items add column if not exists capacity_ml numeric;
      alter table public.tea_items add column if not exists pore_type text;
      alter table public.tea_items add column if not exists paired_tea text;
      alter table public.tea_items add column if not exists storage_location text;
      alter table public.tea_items add column if not exists tags text;
      alter table public.tea_items add column if not exists flavor_profile jsonb;
      alter table public.tea_items add column if not exists brewing_guide jsonb;
      alter table public.tea_items add column if not exists rating numeric default 5;
      alter table public.tea_items add column if not exists low_stock_threshold numeric;
    `);
  } catch (e) {
    console.warn('ensureTeaItemsColumns warning:', e.message);
  }
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
      else if (action === 'get_tasting_notes') {
        try {
          const result = await db.query(
            `SELECT n.* FROM public.tasting_notes n 
             JOIN public.tea_items t ON n.item_id = t.id 
             WHERE t.id = $1 AND t.user_id = $2 
             ORDER BY n.created_at DESC`,
            [id, user.id]
          );
          return res.status(200).json({ data: result.rows });
        } catch (queryErr) {
          if (queryErr.message && queryErr.message.includes('tasting_notes')) {
            console.log('tasting_notes table does not exist, creating automatically...');
            await ensureTastingNotesTable(db);
            return res.status(200).json({ data: [] });
          }
          throw queryErr;
        }
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
      const op = body.action || action || 'create';

      // 1. Delete (Ensure ownership)
      if (op === 'delete') {
        const result = await db.query('DELETE FROM public.tea_items WHERE id = $1 AND user_id = $2', [body.id, user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Item not found or unauthorized' });
        return res.status(200).json({ success: true });
      }

      // Tasting Note Actions
      if (op === 'create_tasting_note') {
        const noteData = body.data || {};
        try {
          const result = await db.query(
            `INSERT INTO public.tasting_notes 
             (item_id, user_id, rating, water_temp, steep_seconds, tea_amount, ware_name, soup_color, flavor_tags, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
              noteData.item_id,
              user.id,
              noteData.rating || 5,
              noteData.water_temp || null,
              noteData.steep_seconds || null,
              noteData.tea_amount || null,
              noteData.ware_name || null,
              noteData.soup_color || null,
              noteData.flavor_tags || null,
              noteData.notes || '',
              Date.now()
            ]
          );
          return res.status(200).json({ data: result.rows[0] });
        } catch (insertErr) {
          if (insertErr.message && insertErr.message.includes('tasting_notes')) {
            console.log('tasting_notes table missing during create, auto-creating...');
            await ensureTastingNotesTable(db);
            const retryRes = await db.query(
              `INSERT INTO public.tasting_notes 
               (item_id, user_id, rating, water_temp, steep_seconds, tea_amount, ware_name, soup_color, flavor_tags, notes, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
              [
                noteData.item_id,
                user.id,
                noteData.rating || 5,
                noteData.water_temp || null,
                noteData.steep_seconds || null,
                noteData.tea_amount || null,
                noteData.ware_name || null,
                noteData.soup_color || null,
                noteData.flavor_tags || null,
                noteData.notes || '',
                Date.now()
              ]
            );
            return res.status(200).json({ data: retryRes.rows[0] });
          }
          throw insertErr;
        }
      }

      if (op === 'delete_tasting_note') {
        try {
          await db.query('DELETE FROM public.tasting_notes WHERE id = $1 AND user_id = $2', [body.id, user.id]);
        } catch (delErr) {
          if (!delErr.message?.includes('tasting_notes')) throw delErr;
        }
        return res.status(200).json({ success: true });
      }

      // 2. Batch Import (Restore from JSON Backup)
      if (op === 'batch_import') {
        const { items: importItems, mode } = body;
        if (!Array.isArray(importItems) || importItems.length === 0) {
          return res.status(400).json({ error: '无效的备份数据，必须包含藏品列表' });
        }

        const client = await db.connect();
        try {
          await client.query('BEGIN');
          await ensureTeaItemsColumns(client);

          // If mode is 'replace', delete all existing items for this user
          if (mode === 'replace') {
            await client.query('DELETE FROM public.tea_items WHERE user_id = $1', [user.id]);
          }

          const commonFields = [
            'name', 'type', 'category', 'year', 'origin', 'description',
            'image_url', 'quantity', 'unit', 'price', 'unit_price',
            'material', 'capacity_ml', 'pore_type', 'paired_tea', 'storage_location',
            'tags', 'flavor_profile', 'brewing_guide', 'rating', 'low_stock_threshold'
          ];
          const allFields = ['user_id', ...commonFields, 'created_at'];
          const cols = allFields.map(f => `"${f}"`).join(', ');
          const placeholders = allFields.map((_, i) => `$${i + 1}`).join(', ');

          let importedCount = 0;
          for (const item of importItems) {
            if (!item.name) continue;
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const unitPrice = qty > 0 && price >= 0 ? price / qty : 0;

            const formattedFlavor = item.flavor_profile
              ? (typeof item.flavor_profile === 'string' ? item.flavor_profile : JSON.stringify(item.flavor_profile))
              : null;
            const formattedBrewing = item.brewing_guide
              ? (typeof item.brewing_guide === 'string' ? item.brewing_guide : JSON.stringify(item.brewing_guide))
              : null;

            const dataToSave = {
              name: item.name,
              type: item.type === 'TEAWARE' ? 'TEAWARE' : 'TEA',
              category: item.category || '未分类',
              year: item.year || '',
              origin: item.origin || '',
              description: item.description || '',
              image_url: item.image_url || '',
              quantity: qty,
              unit: item.unit || (item.type === 'TEAWARE' ? '件' : '克 (g)'),
              price: price,
              unit_price: unitPrice,
              material: item.material || null,
              capacity_ml: item.capacity_ml ? parseFloat(item.capacity_ml) : null,
              pore_type: item.pore_type || null,
              paired_tea: item.paired_tea || null,
              storage_location: item.storage_location || null,
              tags: item.tags || null,
              flavor_profile: formattedFlavor,
              brewing_guide: formattedBrewing,
              rating: item.rating ? parseFloat(item.rating) : 5,
              low_stock_threshold: item.low_stock_threshold ? parseFloat(item.low_stock_threshold) : null
            };

            const values = [
              user.id,
              ...commonFields.map(f => dataToSave[f]),
              item.created_at ? Number(item.created_at) : Date.now()
            ];

            const insertRes = await client.query(
              `INSERT INTO public.tea_items (${cols}) VALUES (${placeholders}) RETURNING id`,
              values
            );

            const newId = insertRes.rows[0]?.id;
            if (newId && qty > 0) {
              await client.query(
                `INSERT INTO public.inventory_logs (item_id, change_amount, current_balance, reason, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                [newId, qty, qty, 'INITIAL', '备份导入入库', Date.now()]
              );
            }
            importedCount++;
          }

          await client.query('COMMIT');
          return res.status(200).json({ success: true, importedCount });
        } catch (e) {
          await client.query('ROLLBACK');
          console.error('Batch import error:', e);
          throw e;
        } finally {
          client.release();
        }
      }

      // 3. Create / Update
      if (op === 'create' || op === 'update') {
        const itemData = body.data;
        if (!itemData) {
            return res.status(400).json({ error: 'Missing item data' });
        }

        let computedUnitPrice = 0;
        const qty = parseFloat(itemData.quantity);
        const totalPrice = parseFloat(itemData.price);
        if (qty > 0 && totalPrice >= 0) {
            computedUnitPrice = totalPrice / qty;
        }

        const commonFields = [
          'name', 'type', 'category', 'year', 'origin', 'description',
          'image_url', 'quantity', 'unit', 'price', 'unit_price',
          'material', 'capacity_ml', 'pore_type', 'paired_tea', 'storage_location',
          'tags', 'flavor_profile', 'brewing_guide', 'rating', 'low_stock_threshold'
        ];

        // 格式化 JSON 数据确保 PostgreSQL 安全存取
        const formattedFlavor = itemData.flavor_profile ? JSON.stringify(itemData.flavor_profile) : null;
        const formattedBrewing = itemData.brewing_guide ? JSON.stringify(itemData.brewing_guide) : null;

        const dataToSave = {
          ...itemData,
          unit_price: computedUnitPrice,
          flavor_profile: formattedFlavor,
          brewing_guide: formattedBrewing,
          capacity_ml: itemData.capacity_ml ? parseFloat(itemData.capacity_ml) : null,
          rating: itemData.rating ? parseFloat(itemData.rating) : 5,
          low_stock_threshold: itemData.low_stock_threshold ? parseFloat(itemData.low_stock_threshold) : null
        };

        if (op === 'update') {
          // Update (Ensure ownership)
          const setClause = commonFields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');
          const values = [body.id, user.id, ...commonFields.map(f => dataToSave[f])];
          
          try {
            const result = await db.query(
              `UPDATE public.tea_items SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
              values
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found or unauthorized' });
            return res.status(200).json({ data: result.rows[0] });
          } catch (updateErr) {
            if (updateErr.message && (updateErr.message.includes('column') || updateErr.message.includes('does not exist'))) {
              await ensureTeaItemsColumns(db);
              const retryRes = await db.query(
                `UPDATE public.tea_items SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
                values
              );
              return res.status(200).json({ data: retryRes.rows[0] });
            }
            throw updateErr;
          }
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
            
            let newItem;
            try {
              const result = await client.query(
                `INSERT INTO public.tea_items (${cols}) VALUES (${placeholders}) RETURNING *`,
                values
              );
              newItem = result.rows[0];
            } catch (insertErr) {
              if (insertErr.message && (insertErr.message.includes('column') || insertErr.message.includes('does not exist'))) {
                await ensureTeaItemsColumns(client);
                const retryInsert = await client.query(
                  `INSERT INTO public.tea_items (${cols}) VALUES (${placeholders}) RETURNING *`,
                  values
                );
                newItem = retryInsert.rows[0];
              } else {
                throw insertErr;
              }
            }
            
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
