export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GEMINI_API_KEY: string;
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
        return json(results.map((p: any) => ({
          ...p,
          categoryId: p.category_id,
          wholesalePrice: p.wholesale_price,
          retailPrice: p.retail_price
        })));
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
      return json(results.map((p: any) => ({
        ...p,
        categoryId: p.category_id,
        wholesalePrice: p.wholesale_price,
        retailPrice: p.retail_price
      })));
    }

    if (path.match(/^\/api\/products\/[^/]+$/) && request.method === 'PUT') {
      const id = path.split('/')[3];
      const b = await request.json() as any;
      await env.DB.prepare(
        `UPDATE products SET name=?, wholesale_price=?, retail_price=?, quantity=?, barcode=?, image=?, category_id=? WHERE id=?`
      ).bind(b.name, b.wholesalePrice || null, b.retailPrice || null, b.quantity || 0, b.barcode || '', b.image || '', b.categoryId, id).run();
      return json({ success: true });
    }

    if (path.match(/^\/api\/products\/[^/]+$/) && request.method === 'DELETE') {
      const id = path.split('/')[3];
      await env.DB.prepare(`DELETE FROM products WHERE id=?`).bind(id).run();
      return json({ success: true });
    }

    // ── Loyal Customers ──
    if (path === '/api/loyal-customers') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare(`SELECT * FROM loyal_customers ORDER BY created_at DESC`).all();
        return json(results.map((c: any) => ({
          ...c,
          createdAt: c.created_at
        })));
      }
      if (request.method === 'POST') {
        const b = await request.json() as any;
        await env.DB.prepare(
          `INSERT OR REPLACE INTO loyal_customers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)`
        ).bind(b.id, b.name, b.phone || '', b.address || '', Date.now()).run();
        return json({ success: true, id: b.id });
      }
    }

    if (path.match(/^\/api\/loyal-customers\/[^/]+$/) && request.method === 'GET') {
      const id = path.split('/')[3];
      const result = await env.DB.prepare(`SELECT * FROM loyal_customers WHERE id = ?`).bind(id).first();
      if (!result) return json({ error: 'Customer not found' }, 404);
      return json({ ...result, createdAt: (result as any).created_at });
    }

    if (path.match(/^\/api\/loyal-customers\/[^/]+$/) && request.method === 'PUT') {
      const id = path.split('/')[3];
      const b = await request.json() as any;
      await env.DB.prepare(`UPDATE loyal_customers SET name=?, phone=?, address=? WHERE id=?`)
        .bind(b.name, b.phone || '', b.address || '', id).run();
      return json({ success: true });
    }

    if (path.match(/^\/api\/loyal-customers\/[^/]+$/) && request.method === 'DELETE') {
      const id = path.split('/')[3];
      await env.DB.prepare(`DELETE FROM loyal_customers WHERE id=?`).bind(id).run();
      return json({ success: true });
    }

    // ── Sales ──
    if (path === '/api/sales') {
      if (request.method === 'GET') {
        const q = url.searchParams.get('q');
        const customerId = url.searchParams.get('customerId');
        let results;
        if (customerId) {
          const r = await env.DB.prepare(`SELECT * FROM sales WHERE customer_id=? ORDER BY date DESC`).bind(customerId).all();
          results = r.results;
        } else if (q) {
          const r = await env.DB.prepare(`SELECT * FROM sales WHERE product_name LIKE ? ORDER BY date DESC`).bind(`%${q}%`).all();
          results = r.results;
        } else {
          const r = await env.DB.prepare(`SELECT * FROM sales ORDER BY date DESC`).all();
          results = r.results;
        }
        return json(results.map((s: any) => ({
          ...s,
          productId: s.product_id,
          productName: s.product_name,
          sellingPrice: s.selling_price,
          customerId: s.customer_id,
          paymentStatus: s.payment_status || 'unpaid',
          quantity: s.quantity || 1
        })));
      }
      if (request.method === 'POST') {
        const b = await request.json() as any;
        try {
          await env.DB.prepare(
            `INSERT INTO sales (id, product_id, product_name, selling_price, date, customer_id, payment_status, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(b.id, b.productId || null, b.productName, b.sellingPrice, b.date, b.customerId || null, b.paymentStatus || 'unpaid', b.quantity || 1, Date.now()).run();
        } catch (e) {
          await env.DB.prepare(
            `INSERT INTO sales (id, product_id, product_name, selling_price, date, customer_id, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(b.id, b.productId || null, b.productName, b.sellingPrice, b.date, b.customerId || null, b.paymentStatus || 'unpaid', Date.now()).run();
        }
        return json({ success: true });
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM sales`).run();
        return json({ success: true });
      }
    }

    if (path === '/api/sales/total') {
      const { results } = await env.DB.prepare(`SELECT SUM(selling_price) as total FROM sales WHERE payment_status = 'paid'`).all();
      return json({ total: (results[0] as any)?.total || 0 });
    }

    if (path === '/api/sales/profits') {
      try {
        const { results } = await env.DB.prepare(`
          SELECT s.selling_price as revenue, p.wholesale_price as cost, s.quantity as qty
          FROM sales s LEFT JOIN products p ON s.product_id = p.id
          WHERE s.payment_status = 'paid'
        `).all();
        let totalRevenue = 0;
        let totalCost = 0;
        for (const row of results) {
          const r = row as any;
          const qty = r.qty || 1;
          totalRevenue += r.revenue || 0;
          if (r.cost) totalCost += r.cost * qty;
        }
        return json({ totalRevenue, totalCost, profit: totalRevenue - totalCost });
      } catch (error: any) {
        return json({ error: error.message }, 500);
      }
    }

    if (path.match(/^\/api\/sales\/[^/]+$/) && request.method === 'PUT') {
      const id = path.split('/')[3];
      const b = await request.json() as any;
      if (b.paymentStatus) {
        await env.DB.prepare(`UPDATE sales SET payment_status=? WHERE id=?`).bind(b.paymentStatus, id).run();
        return json({ success: true });
      }
      await env.DB.prepare(`DELETE FROM sales WHERE id=?`).bind(id).run();
      return json({ success: true });
    }

    if (path.match(/^\/api\/sales\/[^/]+$/) && request.method === 'DELETE') {
      const id = path.split('/')[3];
      await env.DB.prepare(`DELETE FROM sales WHERE id=?`).bind(id).run();
      return json({ success: true });
    }

    // ── Gemini AI Chat ──
    if (path === '/api/ai/chat' && request.method === 'POST') {
      try {
        if (!env.GEMINI_API_KEY) {
          return json({ response: '⚠️ لم يتم إعداد مفتاح Gemini API.' }, 500);
        }

        const { message } = await request.json() as any;
        
        // استخراج الكلمات المفتاحية
        const stopWords = ['كم', 'ما', 'هل', 'أين', 'متى', 'كيف', 'عدد', 'مخزون', 'سعر', 'منتج', 'بضاعة', 'أريد', 'أن', 'أعرف', 'اعطني', 'كل', 'من', 'في', 'على', 'هذا', 'هذه', 'التي', 'الذي', 'منخفضة', 'المنخفضة', 'صنف', 'أي'];
        
        const searchTerms = message.toLowerCase()
          .replace(/[؟?.,!]/g, '')
          .split(' ')
          .filter((w: string) => w.length > 2 && !stopWords.includes(w))
          .slice(0, 3);
        
        // جلب البيانات الأساسية مع أسماء الأصناف مباشرة
        const [categories, recentSales, customers, totalStats] = await Promise.all([
          env.DB.prepare(`SELECT * FROM categories ORDER BY created_at DESC`).all().then(r => r.results),
          env.DB.prepare(`SELECT * FROM sales ORDER BY date DESC LIMIT 20`).all().then(r => r.results),
          env.DB.prepare(`SELECT * FROM loyal_customers ORDER BY created_at DESC LIMIT 10`).all().then(r => r.results),
          env.DB.prepare(`SELECT COUNT(*) as total, SUM(quantity) as total_qty FROM products`).first(),
        ]);

        // جلب المنتجات مع أسماء الأصناف (JOIN)
        let relevantProducts: any[] = [];
        let lowStockProducts: any[] = [];
        
        if (searchTerms.length > 0) {
          const mainKeyword = searchTerms.reduce((a: string, b: string) => a.length > b.length ? a : b);
          const searchPattern = `%${mainKeyword}%`;
          
          try {
            const searchResults = await env.DB.prepare(`
              SELECT p.*, c.name as category_name 
              FROM products p 
              LEFT JOIN categories c ON p.category_id = c.id 
              WHERE p.name LIKE ? OR p.barcode LIKE ? 
              LIMIT 20
            `).bind(searchPattern, searchPattern).all();
            relevantProducts = searchResults.results || [];
          } catch (searchError) {
            console.error('Search error:', searchError);
            relevantProducts = [];
          }
        }
        
        // جلب المنتجات المنخفضة مع أسماء الأصناف
        try {
          const [lowStock, recentProducts] = await Promise.all([
            env.DB.prepare(`
              SELECT p.*, c.name as category_name 
              FROM products p 
              LEFT JOIN categories c ON p.category_id = c.id 
              WHERE p.quantity <= 5 
              ORDER BY p.quantity ASC 
              LIMIT 20
            `).all().then(r => r.results),
            env.DB.prepare(`
              SELECT p.*, c.name as category_name 
              FROM products p 
              LEFT JOIN categories c ON p.category_id = c.id 
              ORDER BY p.created_at DESC 
              LIMIT 15
            `).all().then(r => r.results),
          ]);
          lowStockProducts = lowStock;
          const seen = new Set(relevantProducts.map((p: any) => p.id));
          relevantProducts = [...relevantProducts, ...recentProducts.filter((p: any) => !seen.has(p.id))].slice(0, 25);
        } catch (e) {
          console.error('Error fetching products:', e);
        }

        // تجميع المنتجات المنخفضة حسب الصنف للسياق
        const lowStockByCategory: Record<string, any[]> = {};
        lowStockProducts.forEach((p: any) => {
          const catName = p.category_name || 'غير مصنف';
          if (!lowStockByCategory[catName]) lowStockByCategory[catName] = [];
          lowStockByCategory[catName].push(p);
        });

        const totalSales = recentSales.reduce((sum: number, s: any) => sum + (s.selling_price || 0), 0);
        const unpaidSales = recentSales.filter((s: any) => s.payment_status === 'unpaid');

        // بناء السياق المحسّن
        let context = `
بيانات المتجر (التاريخ: ${new Date().toLocaleDateString('ar-DZ')}):

📊 إحصائيات عامة:
- إجمالي المنتجات: ${(totalStats as any)?.total || 0} منتج
- إجمالي الكمية في المخزون: ${(totalStats as any)?.total_qty || 0} قطعة

📂 الأصناف المتوفرة (${categories.length}):
${categories.map((c: any) => `- ${c.name}`).join('\n')}
`;

        // إضافة المنتجات المنخفضة مُجمّعة حسب الصنف
        if (lowStockProducts.length > 0) {
          context += `

⚠️ المنتجات منخفضة المخزون (${lowStockProducts.length} منتج) مُجمّعة حسب الصنف:
`;
          Object.entries(lowStockByCategory).forEach(([catName, products]) => {
            context += `
📁 صنف "${catName}" (${products.length} منتج):
${products.map((p: any) => `  • ${p.name}: ${p.quantity || 0} قطعة (سعر: ${p.retail_price || '-'} د.ج)`).join('\n')}
`;
          });
        }

        // إضافة المنتجات المطابقة للبحث
        if (relevantProducts.length > 0) {
          context += `

📦 منتجات ذات صلة بالبحث (${relevantProducts.length}):
${relevantProducts.slice(0, 10).map((p: any) => 
  `- ${p.name} (صنف: ${p.category_name || 'غير مصنف'}): ${p.quantity || 0} قطعة (سعر الجملة: ${p.wholesale_price || '-'} د.ج، سعر التجزئة: ${p.retail_price || '-'} د.ج)`
).join('\n')}
`;
        }

        // تفاصيل منتج محدد إذا طُلب
        let productDetails = null;
        if (relevantProducts.length > 0) {
          const exactMatch = relevantProducts.find((p: any) => 
            message.toLowerCase().includes(p.name.toLowerCase())
          ) || relevantProducts[0];
          
          if (exactMatch) {
            try {
              const salesHistory = await env.DB.prepare(
                `SELECT * FROM sales WHERE product_id = ? ORDER BY date DESC LIMIT 3`
              ).bind(exactMatch.id).all();
              productDetails = { ...exactMatch, salesHistory: salesHistory.results || [] };
            } catch (e) { console.error(e); }
          }
        }

        if (productDetails) {
          context += `

🔍 تفاصيل "${productDetails.name}" (صنف: ${productDetails.category_name || 'غير مصنف'}):
- الكمية: ${productDetails.quantity || 0} قطعة
- سعر الجملة: ${productDetails.wholesale_price || 'غير محدد'} د.ج
- سعر التجزئة: ${productDetails.retail_price || 'غير محدد'} د.ج
${productDetails.salesHistory.length > 0 ? `- آخر بيع: ${productDetails.salesHistory[0].date} بـ${productDetails.salesHistory[0].selling_price} د.ج` : ''}
`;
        }

        context += `

💰 آخر المبيعات (${recentSales.length} عملية - الإجمالي: ${totalSales.toLocaleString('ar-DZ')} د.ج):
${recentSales.slice(0, 5).map((s: any) => `- ${s.product_name}: ${s.selling_price?.toLocaleString('ar-DZ')} د.ج (${s.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'})`).join('\n') || 'لا توجد'}

💳 غير مدفوعة (${unpaidSales.length}):
${unpaidSales.slice(0, 5).map((s: any) => `- ${s.product_name}: ${s.selling_price?.toLocaleString('ar-DZ')} د.ج`).join('\n') || 'لا يوجد'}

👥 العملاء (${customers.length}):
${customers.slice(0, 5).map((c: any) => `- ${c.name}${c.phone ? ` (${c.phone})` : ''}`).join('\n') || 'لا يوجد'}
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                                parts: [{ 
                  text: `أنت مساعد ذكي لمتجر إلكتروني. لديك وصول لبيانات المتجر في الوقت الفعلي.
أجب دائماً باللغة العربية الفصحى بشكل مختصر ومفيد.
عند سؤالك عن "المنتجات المنخفضة في صنف معين"، ابحث في بيانات المنتجات المنخفضة المُجمّعة حسب الصنف وقدم الإجابة الدقيقة.
استخدم أسماء الأصناف المذكورة في البيانات.
كن ودوداً ومهنياً.` 
                }]
              },
              contents: [{ role: "user", parts: [{ text: `${context}\n\nسؤال المستخدم: ${message}` }] }]
            }),
          }
        );

        if (!geminiRes.ok) {
          const errorData = await geminiRes.json().catch(() => ({}));
          if (geminiRes.status === 429) {
            return json({ response: '⚠️ تم تجاوز الحصة المجانية. يرجى الانتظار.' }, 429);
          }
          return json({ response: `⚠️ خطأ: ${errorData.error?.message || 'حدث خطأ'}` }, 500);
        }

        const data = await geminiRes.json() as any;
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من الرد.';
        return json({ response: reply });
      } catch (error: any) {
        console.error('Worker AI Error:', error);
        return json({ error: error.message }, 500);
      }
    }

    // ── Frontend ──
    if (path.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }
    const indexRequest = new Request(new URL('/', request.url).toString(), request);
    return env.ASSETS.fetch(indexRequest);
  },
};