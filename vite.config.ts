import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-dev-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            const parsedUrl = new URL(req.url, 'http://localhost:3000');
            const routeName = parsedUrl.pathname.replace(/^\/api\//, '').split('/')[0].split('?')[0];
            const query: Record<string, string> = {};
            parsedUrl.searchParams.forEach((v, k) => {
              query[k] = v;
            });

            try {
              const apiModule = await import(`./api/${routeName}.js`);
              if (apiModule && apiModule.default) {
                let body: any = {};
                // If not an upload route, parse JSON body
                if (routeName !== 'upload' && (req.method === 'POST' || req.method === 'PUT')) {
                  const buffers: Buffer[] = [];
                  for await (const chunk of req) {
                    buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                  }
                  const raw = Buffer.concat(buffers).toString('utf-8');
                  if (raw) {
                    try {
                      body = JSON.parse(raw);
                    } catch {
                      body = raw;
                    }
                  }
                }

                const customReq = Object.assign(req, {
                  query,
                  body
                });

                const customRes = Object.assign(res, {
                  status(code: number) {
                    res.statusCode = code;
                    return customRes;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return customRes;
                  }
                });

                return await apiModule.default(customReq, customRes);
              }
            } catch (err: any) {
              console.error(`Dev API [${routeName}] Error:`, err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Server error' }));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
