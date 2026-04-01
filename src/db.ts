import { useState, useEffect } from 'react';

/**
 * ── Types ──
 * تعريف أنواع البيانات المستخدمة في التطبيق
 */
export interface Category {
  id?: string;
  name: string;
  image?: string;
}

export interface Product {
  id?: string;
  categoryId?: string;
  name: string;
  wholesalePrice?: number;
  retailPrice?: number;
  quantity?: number;
  barcode?: string;
  image?: string;
}

export interface Sale {
  id?: string;
  productId?: string;
  productName: string;
  sellingPrice: number;
  date: string; // ISO string
}

const API = '/api';

/**
 * نظام إشعارات داخلي لتحديث الواجهات عند تغيير البيانات
 */
const notifyChange = () => window.dispatchEvent(new CustomEvent('db-change'));

/**
 * ── Categories ──
 * وظائف التعامل مع التصنيفات عبر السحاب
 */
export const getCategories = async (): Promise<Category[]> => {
  const res = await fetch(`${API}/categories`);
  return res.json();
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<void> => {
  await fetch(`${API}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...category, id: Date.now().toString() }),
  });
  notifyChange();
};

export const updateCategory = async (id: string, data: Partial<Category>): Promise<void> => {
  await fetch(`${API}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  notifyChange();
};

export const deleteCategory = async (id: string): Promise<void> => {
  await fetch(`${API}/categories/${id}`, { method: 'DELETE' });
  notifyChange();
};

/**
 * ── Products ──
 * وظائف التعامل مع المنتجات عبر السحاب
 */
export const getProducts = async (categoryId?: string): Promise<Product[]> => {
  const url = categoryId ? `${API}/products?categoryId=${categoryId}` : `${API}/products`;
  const res = await fetch(url);
  return res.json();
};

export const addProduct = async (product: Omit<Product, 'id'>): Promise<void> => {
  await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...product, id: Date.now().toString() }),
  });
  notifyChange();
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  await fetch(`${API}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  notifyChange();
};

export const deleteProduct = async (id: string): Promise<void> => {
  await fetch(`${API}/products/${id}`, { method: 'DELETE' });
  notifyChange();
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const res = await fetch(`${API}/products/search?q=${encodeURIComponent(query)}`);
  return res.json();
};

/**
 * ── Sales ──
 */
export const getSales = async (query?: string): Promise<Sale[]> => {
  const url = query ? `${API}/sales?q=${encodeURIComponent(query)}` : `${API}/sales`;
  const res = await fetch(url);
  return res.json();
};

export const addSale = async (sale: Omit<Sale, 'id'>): Promise<void> => {
  await fetch(`${API}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...sale, id: Date.now().toString() }),
  });
  notifyChange();
};

export const deleteSale = async (id: string): Promise<void> => {
  await fetch(`${API}/sales/${id}`, { method: 'DELETE' });
  notifyChange();
};

export const clearSales = async (): Promise<void> => {
  await fetch(`${API}/sales`, { method: 'DELETE' });
  notifyChange();
};

export const getTotalSales = async (): Promise<number> => {
  const res = await fetch(`${API}/sales/total`);
  const data = await res.json();
  return data.total || 0;
};

/**
 * ── Image Upload ──
 */
export const uploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.url || null;
  } catch (e) {
    console.error("Upload error:", e);
    return null;
  }
};

/**
 * ── useLiveQuery ──
 * تحديث تلقائي للواجهة عند حدوث أي تغيير في قاعدة البيانات
 */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: any[] = []): T | undefined {
  const [result, setResult] = useState<T>();
  const [refreshToggle, setRefreshToggle] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const runQuery = async () => {
      try {
        const data = await querier();
        if (isMounted) setResult(data);
      } catch (e) {
        console.error("Cloud Data Error:", e);
      }
    };

    runQuery();

    const handleUpdate = () => runQuery();
    window.addEventListener('db-change', handleUpdate);
    
    return () => { 
      isMounted = false; 
      window.removeEventListener('db-change', handleUpdate);
    };
  }, [...deps, refreshToggle]);

  return result;
}

/**
 * ── Compatibility Bridge (Dexie Legacy Support) ──
 * دعم كامل لجميع الوظائف المطلوبة في ملفات Categories.tsx و Home.tsx
 */
export const db = {
  categories: {
    toArray: getCategories,
    add: addCategory,
    update: updateCategory,
    delete: deleteCategory,
    count: async () => (await getCategories()).length
  },
  products: {
    toArray: getProducts,
    add: addProduct,
    update: updateProduct,
    delete: deleteProduct,
    count: async () => (await getProducts()).length,
    filter: (fn: (p: Product) => boolean) => ({
      count: async () => (await getProducts()).filter(fn).length,
      toArray: async () => (await getProducts()).filter(fn)
    })
  },
  sales: {
    toArray: getSales,
    add: addSale,
    delete: deleteSale,
    filter: (fn: (s: Sale) => boolean) => ({
      toArray: async () => (await getSales()).filter(fn)
    })
  },
  // لدعم البحث القديم في بعض الصفحات
  items: {
    toArray: getProducts,
    add: addProduct,
    where: (field: string) => ({
      equals: (value: any) => ({
        first: async () => {
          const items = await searchProducts(value);
          return items.length > 0 ? items[0] : null;
        }
      })
    })
  }
};
