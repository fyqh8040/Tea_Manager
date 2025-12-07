
export default function handler(req, res) {
  // 允许跨域（如果需要），通常同源不需要，但为了保险起见
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // 只返回公开的 NEXT_PUBLIC_ 变量，确保安全
  res.status(200).json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    imageApiUrl: process.env.NEXT_PUBLIC_IMAGE_API_URL || '',
    imageApiToken: process.env.NEXT_PUBLIC_IMAGE_API_TOKEN || ''
  });
}
