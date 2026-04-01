import Dexie, { Table } from 'dexie';

export interface Category {
  id?: number;
  name: string;
  image?: string; // base64
}

export interface Product {
  id?: number;
  categoryId?: number;
  name: string;
  wholesalePrice?: number;
  retailPrice?: number;
  quantity?: number;
  barcode?: string;
  image?: string; // base64
}

export interface Sale {
  id?: number;
  productId?: number;
  productName: string;
  sellingPrice: number;
  date: Date;
}

export class StoreDatabase extends Dexie {
  categories!: Table<Category, number>;
  products!: Table<Product, number>;
  sales!: Table<Sale, number>;

  constructor() {
    super('StoreDatabase');
    this.version(1).stores({
      categories: '++id, name',
      products: '++id, categoryId, name, barcode',
      sales: '++id, productId, productName, date'
    });
  }
}

export const db = new StoreDatabase();
