
export const config = {
  api: {
    bodyParser: false, // 禁用自动解析，直接接收文件流
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetUrl = process.env.NEXT_PUBLIC_IMAGE_API_URL;
    const token = process.env.NEXT_PUBLIC_IMAGE_API_TOKEN;

    if (!targetUrl) {
      throw new Error('Server Error: NEXT_PUBLIC_IMAGE_API_URL not configured');
    }

    // 处理 API URL，确保以 /upload 结尾
    let apiUrl = targetUrl.replace(/\/$/, '');
    if (!apiUrl.endsWith('/upload')) {
        apiUrl += '/upload';
    }

    // 读取请求流到 Buffer (兼容性更好的方式，避免某些 Node 环境下的 stream 问题)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 构造转发头
    const headers = {
      // 关键：透传客户端的 Content-Type (包含 boundary 信息)
      'Content-Type': req.headers['content-type'],
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 服务端转发请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: buffer
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Upstream API Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Upload Proxy Error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed internally' });
  }
}
