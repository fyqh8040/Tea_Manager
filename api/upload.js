
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

    // 1. 构造上游 URL 对象
    let apiUrlStr = targetUrl.replace(/\/$/, '');
    if (!apiUrlStr.endsWith('/upload')) {
        apiUrlStr += '/upload';
    }
    const upstreamUrl = new URL(apiUrlStr);

    // 2. 处理 Query 参数转发 (根据文档，uploadFolder 是 Query 参数)
    // 从 req.query 中获取 uploadFolder，并添加到上游 URL 的 searchParams 中
    const { uploadFolder } = req.query;
    if (uploadFolder) {
        upstreamUrl.searchParams.set('uploadFolder', uploadFolder);
    }

    // 读取请求流到 Buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 构造转发头
    const headers = {
      'Content-Type': req.headers['content-type'],
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 服务端转发请求
    const response = await fetch(upstreamUrl.toString(), {
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
