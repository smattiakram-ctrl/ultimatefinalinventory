export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const APP_URL = 'https://ultimatefinalinventory.smattiakram.workers.dev';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    // ── GitHub OAuth ──
    if (path === '/api/auth/github') {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=${APP_URL}/api/auth/callback`,
        302
      );
    }

    if (path === '/api/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) return Response.redirect(`${APP_URL}?error=no_code`, 302);

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
      });
      const tokenData = await tokenRes.json() as any;
      const accessToken = tokenData.access_token;
      if (!accessToken) return Response.redirect(`${APP_URL}?error=no_token`, 302);

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'NabilApp' },
      });
      const g = await userRes.json() as any;

      await env.DB.prepare(
        `INSERT OR REPLACE INTO users (id, name, email, picture, created_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(g.id.toString(), g.name || g.login, g.email || g.login + '@github', g.avatar_url, Date.now()).run();

      const user = { id: g.id.toString(), name: g.name || g.login, email: g.email || g.login + '@github', picture: g.avatar_url };
      return Response.redirect(`${APP_URL}?user=${encodeURIComponent(JSON.stringify(user))}`, 302);
    }

    // ── Image Upload ──
    if (path === '/api/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) return json({ error: 'no file' }, 400);
      const key = `images/${Date.now()}-${file.name}`;
      await env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return json({ url: `/api/image/${key}` });
    }

    // ── Image Fetch ──
    if (path.startsWith('/api/image/')) {
      const key = path.replace('/api/image/', '');
      const object = await env.R2.get(key);
      if (!object) return new Response('Not found', { status: 404 });
      return new Response(object.body, {
        headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg' },
      });
    }

    // ── Categories ──
    if (path === '/api/categories') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare(`SELECT * FROM categories ORDER BY created_at DESC`).all();
        return json(results);
      }
      if (request.method === 'POST') {
        const b = await request.json() as any;
        await env.DB.prepare(`INSERT OR REPLACE INTO categories (id, name, image, created_at) VALUES (?, ?, ?, ?)`)
          .bind(b.id, b.name, b.image || '', Date.now()).run();
        return json({ success: true });
      }
    }

    if (path.match(/^\/api\/categories\/[^/]+$/)) {
      const id = path.split('/')[3];
      if (request.method === 'PUT') {
        const b = await request.json() as any;
        await env.DB.prepare(`UPDATE categories SET name=?, image=? WHERE id=?`).bind(b.name, b.image || '', id).run();
        return json({ success: true });
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM products WHERE category_id=?`).bind(id).run();
        await env.DB.prepare(`DELETE FROM categories WHERE id=?`).bind(id).run();
        return json({ success: true });
      }
    }

    // ── Products ──
    if (path === '/api/products') {
      if (request.method === 'GET') {
        const categoryId = url.searchParams.get('categoryId');
        let results;
        if (categoryId) {
          const r = await env.DB.prepare(`SELECT * FROM products WHERE category_id=? ORDER BY created_at DESC`).bind(categoryId).all();
          results = r.results;
        } else {
          const r = await env.DB.prepare(`SELECT * FROM products ORDER BY created_at DESC`).all();
          results = r.results;
        }
        return json(results.map((p: any) => ({ ...p, categoryId: p.category_id, wholesalePrice: p.wholesale_price, retailPrice: p.retail_price })));
      }
      if (request.method === 'POST') {
        const b = await request.json() as any;
        await env.DB.prepare(
          `INSERT OR REPLACE INTO products (id, category_id, name, wholesale_price, retail_price, quantity, barcode, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(b.id, b.categoryId, b.name, b.wholesalePrice || null, b.retailPrice || null, b.quantity || 0, b.barcode || '', b.image || '', Date.now()).run();
        return json({ success: true });
      }
    }

    if (path === '/api/products/search') {
      const q = url.searchParams.get('q') || '';
      const { results } = await env.DB.prepare(
        `SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? LIMIT 10`
      ).bind(`%${q}%`, `%${q}%`).all();
      return json(results.map((p: any) => ({ ...p, categoryId: p.category_id, wholesalePrice: p.wholesale_price, retailPrice: p.retail_price })));
    }

    if (path.match(/^\/api\/products\/[^/]+$/)) {
      const id = path.split('/')[3];
      if (request.method === 'PUT') {
        const b = await request.json() as any;
        await env.DB.prepare(
          `UPDATE products SET name=?, wholesale_price=?, retail_price=?, quantity=?, barcode=?, image=?, category_id=? WHERE id=?`
        ).bind(b.name, b.wholesalePrice || null, b.retailPrice || null, b.quantity || 0, b.barcode || '', b.image || '', b.categoryId, id).run();
        return json({ success: true });
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM products WHERE id=?`).bind(id).run();
        return json({ success: true });
      }
    }

    // ── Sales ──
    if (path === '/api/sales') {
      if (request.method === 'GET') {
        const q = url.searchParams.get('q');
        let results;
        if (q) {
          const r = await env.DB.prepare(`SELECT * FROM sales WHERE product_name LIKE ? ORDER BY date DESC`).bind(`%${q}%`).all();
          results = r.results;
        } else {
          const r = await env.DB.prepare(`SELECT * FROM sales ORDER BY date DESC`).all();
          results = r.results;
        }
        return json(results.map((s: any) => ({ ...s, productId: s.product_id, productName: s.product_name, sellingPrice: s.selling_price })));
      }
      if (request.method === 'POST') {
        const b = await request.json() as any;
        await env.DB.prepare(
          `INSERT INTO sales (id, product_id, product_name, selling_price, date, created_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(b.id, b.productId || null, b.productName, b.sellingPrice, b.date, Date.now()).run();
        return json({ success: true });
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM sales`).run();
        return json({ success: true });
      }
    }

    if (path === '/api/sales/total') {
      const { results } = await env.DB.prepare(`SELECT SUM(selling_price) as total FROM sales`).all();
      return json({ total: (results[0] as any)?.total || 0 });
    }

    if (path.match(/^\/api\/sales\/[^/]+$/) && request.method === 'DELETE') {
      const id = path.split('/')[3];
      await env.DB.prepare(`DELETE FROM sales WHERE id=?`).bind(id).run();
      return json({ success: true });
    }

    // ── Frontend ──
    return env.ASSETS.fetch(request);
  },
};
