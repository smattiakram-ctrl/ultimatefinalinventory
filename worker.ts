export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const APP_URL = 'https://akramgoodsfinalver.smattiakram.workers.dev';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/auth/github') {
      const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=${APP_URL}/api/auth/callback`;
      return Response.redirect(redirectUrl, 302);
    }

    if (path === '/api/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) return Response.redirect(`${APP_URL}?error=no_code`, 302);

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenRes.json() as any;
      const accessToken = tokenData.access_token;
      if (!accessToken) return Response.redirect(`${APP_URL}?error=no_token`, 302);

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'NabilApp' },
      });
      const githubUser = await userRes.json() as any;

      await env.DB.prepare(
        `INSERT OR REPLACE INTO users (id, name, email, picture, created_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(
        githubUser.id.toString(),
        githubUser.name || githubUser.login,
        githubUser.email || githubUser.login + '@github',
        githubUser.avatar_url,
        Date.now()
      ).run();

      const user = {
        id: githubUser.id.toString(),
        name: githubUser.name || githubUser.login,
        email: githubUser.email || githubUser.login + '@github',
        picture: githubUser.avatar_url,
      };
      return Response.redirect(`${APP_URL}?user=${encodeURIComponent(JSON.stringify(user))}`, 302);
    }

    if (path.startsWith('/api/')) {
      const parts = path.split('/');
      const table = parts[2];
      const id = parts[3];

      if (path === '/api/earnings') {
        const { results } = await env.DB.prepare(
          `SELECT SUM(sold_at_price * quantity) as total FROM sales`
        ).all();
        return json({ total: (results[0] as any)?.total || 0 });
      }

      if (request.method === 'GET' && !id) {
        const { results } = await env.DB.prepare(
          `SELECT * FROM ${table} ORDER BY created_at DESC`
        ).all();
        return json(results);
      }

      if (request.method === 'POST') {
        const body = await request.json() as any;
        if (table === 'categories') {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO categories (id, name, image, created_at) VALUES (?, ?, ?, ?)`
          ).bind(body.id, body.name, body.image || '', Date.now()).run();
        } else if (table === 'products') {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO products (id, name, price, quantity, category_id, barcode, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            body.id, body.name, body.price, body.quantity,
            body.categoryId, body.barcode || '', body.image || '', Date.now()
          ).run();
        } else if (table === 'sales') {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO sales (id, product_id, product_name, product_image, quantity, sold_at_price, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            body.id, body.productId, body.productName,
            body.productImage || '', body.quantity,
            body.soldAtPrice, body.timestamp, Date.now()
          ).run();
        }
        return json({ success: true });
      }

      if (request.method === 'DELETE' && id) {
        await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
        return json({ success: true });
      }

      if (path === '/api/upload' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return json({ error: 'no file' }, 400);
        const key = `images/${Date.now()}-${file.name}`;
        await env.R2.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
        return json({ url: `/api/image/${key}` });
      }

      if (path.startsWith('/api/image/')) {
        const key = path.replace('/api/image/', '');
        const object = await env.R2.get(key);
        if (!object) return new Response('Not found', { status: 404 });
        return new Response(object.body, {
          headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg' },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
