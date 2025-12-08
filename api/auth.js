
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let pool;
const JWT_SECRET = process.env.JWT_SECRET || 'tea-collection-secret-key-change-in-prod';

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

// 验证 Token 中间件逻辑 (Helper)
export const verifyToken = (token) => {
    try {
        if (!token) return null;
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        return decoded;
    } catch (e) {
        return null;
    }
};

export default async function handler(req, res) {
  const { method } = req;
  const db = getPool();

  try {
    // 1. LOGIN
    if (method === 'POST' && req.query.action === 'login') {
        const { username, password } = req.body;
        
        // 特殊处理：针对 admin 用户
        if (username === 'admin') {
            const check = await db.query('SELECT * FROM public.users WHERE username = $1', ['admin']);
            
            if (check.rows.length === 0) {
                // 情况A: 用户不存在，自动创建 (Hash for 'admin')
                const hash = await bcrypt.hash('admin', 10);
                await db.query("INSERT INTO public.users (username, password_hash, role, is_initial) VALUES ('admin', $1, 'admin', true)", [hash]);
            } else {
                // 情况B: 用户存在，检查是否是之前的错误数据 (Bad Hash Fix)
                const user = check.rows[0];
                // 之前的错误 Hash 长度或格式可能导致 bcrypt 无法比对。
                // 如果密码是 'admin' 且 Hash 看起来像之前的占位符(长度不足或特定前缀)，或者验证失败但我们确定是初始状态
                // 这里我们做一个安全网：如果 Hash 长度不对(标准bcrypt是60位) 或者 验证失败但密码是admin且标记为initial
                const isStandardHash = user.password_hash && user.password_hash.length === 60;
                
                if (!isStandardHash) {
                    console.log('Detected invalid admin hash, auto-fixing...');
                    const newHash = await bcrypt.hash('admin', 10);
                    await db.query("UPDATE public.users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
                }
            }
        }

        const result = await db.query('SELECT * FROM public.users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: '用户名不存在' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: '密码错误' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        return res.status(200).json({ 
            token, 
            user: { id: user.id, username: user.username, role: user.role, is_initial: user.is_initial } 
        });
    }

    // 鉴权拦截 - 以下接口都需要 Token
    const authHeader = req.headers.authorization;
    const currentUser = verifyToken(authHeader);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // 2. CHANGE PASSWORD
    if (method === 'POST' && req.query.action === 'change_password') {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '密码太短' });
        
        const hash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE public.users SET password_hash = $1, is_initial = false WHERE id = $2', [hash, currentUser.id]);
        return res.status(200).json({ success: true });
    }

    // 3. GET USERS (Admin Only)
    if (method === 'GET' && req.query.action === 'list_users') {
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const result = await db.query('SELECT id, username, role, created_at FROM public.users ORDER BY created_at ASC');
        return res.status(200).json({ data: result.rows });
    }

    // 4. CREATE USER (Admin Only)
    if (method === 'POST' && req.query.action === 'create_user') {
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { username, password } = req.body;
        
        if (!username || !password) return res.status(400).json({ error: '字段缺失' });
        
        // Check exist
        const check = await db.query('SELECT 1 FROM public.users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: '用户名已存在' });

        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(
            "INSERT INTO public.users (username, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, username, role, created_at", 
            [username, hash]
        );
        return res.status(200).json({ data: result.rows[0] });
    }

    // 5. DELETE USER (Admin Only)
    if (method === 'POST' && req.query.action === 'delete_user') {
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { id } = req.body;
        
        if (id === currentUser.id) return res.status(400).json({ error: '不能删除自己' });

        // Cascade delete will handle tea_items
        await db.query('DELETE FROM public.users WHERE id = $1', [id]);
        return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Not Found' });

  } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
  }
}
