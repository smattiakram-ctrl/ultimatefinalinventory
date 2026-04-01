// ── Types ──
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

// ── Categories ──
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
};

export const updateCategory = async (id: string, data: Partial<Category>): Promise<void> => {
  await fetch(`${API}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const deleteCategory = async (id: string): Promise<void> => {
  await fetch(`${API}/categories/${id}`, { method: 'DELETE' });
};

// ── Products ──
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
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  await fetch(`${API}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const deleteProduct = async (id: string): Promise<void> => {
  await fetch(`${API}/products/${id}`, { method: 'DELETE' });
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const res = await fetch(`${API}/products/search?q=${encodeURIComponent(query)}`);
  return res.json();
};

// ── Sales ──
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
};

export const deleteSale = async (id: string): Promise<void> => {
  await fetch(`${API}/sales/${id}`, { method: 'DELETE' });
};

export const clearSales = async (): Promise<void> => {
  await fetch(`${API}/sales`, { method: 'DELETE' });
};

export const getTotalSales = async (): Promise<number> => {
  const res = await fetch(`${API}/sales/total`);
  const data = await res.json();
  return data.total || 0;
};

// ── Image Upload ──
export const uploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  return data.url || null;
};
