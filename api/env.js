
export default function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // 只返回公开的 NEXT_PUBLIC_ 变量，以及服务端数据库可用状态
  res.status(200).json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    imageApiUrl: process.env.NEXT_PUBLIC_IMAGE_API_URL || '',
    imageApiToken: process.env.NEXT_PUBLIC_IMAGE_API_TOKEN || '',
    // 关键标识：告诉前端服务端是否拥有数据库连接能力
    hasServerDb: !!process.env.DATABASE_URL
  });
}
