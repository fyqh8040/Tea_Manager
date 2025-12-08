
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
                await db.query("INSERT INTO public.users (username, password_hash, nickname, role, is_initial) VALUES ('admin', $1, '藏家', 'admin', true)", [hash]);
            } else {
                // 情况B: 用户存在，检查是否是之前的错误数据 (Bad Hash Fix)
                const user = check.rows[0];
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
            user: { 
                id: user.id, 
                username: user.username, 
                nickname: user.nickname || '藏家', 
                role: user.role, 
                is_initial: user.is_initial 
            } 
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

    // 3. UPDATE PROFILE (Self - Nickname)
    if (method === 'POST' && req.query.action === 'update_profile') {
        const { nickname } = req.body;
        if (!nickname || nickname.trim() === '') return res.status(400).json({ error: '昵称不能为空' });
        
        await db.query('UPDATE public.users SET nickname = $1 WHERE id = $2', [nickname, currentUser.id]);
        return res.status(200).json({ success: true, nickname });
    }

    // 4. GET USERS (Admin Only)
    if (method === 'GET' && req.query.action === 'list_users') {
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const result = await db.query('SELECT id, username, nickname, role, created_at FROM public.users ORDER BY created_at ASC');
        return res.status(200).json({ data: result.rows });
    }

    // 5. CREATE USER (Admin Only)
    if (method === 'POST' && req.query.action === 'create_user') {
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { username, password, nickname } = req.body;
        
        if (!username || !password) return res.status(400).json({ error: '字段缺失' });
        
        // Check exist
        const check = await db.query('SELECT 1 FROM public.users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: '用户名已存在' });

        const hash = await bcrypt.hash(password, 10);
        const finalNickname = nickname && nickname.trim() ? nickname : '藏家';
        
        const result = await db.query(
            "INSERT INTO public.users (username, password_hash, nickname, role) VALUES ($1, $2, $3, 'user') RETURNING id, username, nickname, role, created_at", 
            [username, hash, finalNickname]
        );
        return res.status(200).json({ data: result.rows[0] });
    }

    // 6. UPDATE USER (Admin Only - Modify other user's nickname)
    if (method === 'POST' && req.query.action === 'admin_update_user') {
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { id, nickname } = req.body;
        
        if (!id || !nickname) return res.status(400).json({ error: '参数缺失' });

        await db.query('UPDATE public.users SET nickname = $1 WHERE id = $2', [nickname, id]);
        return res.status(200).json({ success: true });
    }

    // 7. DELETE USER (Admin Only)
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
