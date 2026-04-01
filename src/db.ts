import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  orderBy
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { useState, useEffect } from 'react';

// --- إعدادات Firebase والبيئة ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFirestore = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- تعريف الأنواع (Interfaces) ---
export interface Category {
  id?: string;
  name: string;
  image?: string;
  createdAt?: number;
}

export interface Product {
  id?: string;
  name: string;
  barcode?: string;
  categoryId: string;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice?: number;
  quantity: number;
  image?: string;
  createdAt?: number;
}

export interface Sale {
  id?: string;
  productId: string;
  productName: string;
  sellingPrice: number;
  profit: number;
  date: number;
}

// --- Hook مخصص لجلب البيانات الحية (Live Query) ---
export function useLiveQuery<T>(collectionName: 'categories' | 'products' | 'sales', deps: any[] = []): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    // مسار البيانات الثابت حسب القواعد: /artifacts/{appId}/public/data/{collectionName}
    const q = collection(dbFirestore, 'artifacts', appId, 'public', 'data', collectionName);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(items as T[]);
    }, (error) => {
      console.error(`خطأ في جلب بيانات ${collectionName}:`, error);
    });

    return () => unsubscribe();
  }, [user, collectionName, ...deps]);

  return data;
}

// --- كائن العمليات (CRUD Operations) ---
export const db = {
  categories: {
    add: async (category: Omit<Category, 'id'>) => {
      const colRef = collection(dbFirestore, 'artifacts', appId, 'public', 'data', 'categories');
      return await addDoc(colRef, { ...category, createdAt: Date.now() });
    },
    update: async (id: string, data: Partial<Category>) => {
      const docRef = doc(dbFirestore, 'artifacts', appId, 'public', 'data', 'categories', id);
      return await updateDoc(docRef, { ...data, updatedAt: Date.now() });
    },
    delete: async (id: string) => {
      const docRef = doc(dbFirestore, 'artifacts', appId, 'public', 'data', 'categories', id);
      return await deleteDoc(docRef);
    }
  },
  products: {
    add: async (product: Omit<Product, 'id'>) => {
      const colRef = collection(dbFirestore, 'artifacts', appId, 'public', 'data', 'products');
      return await addDoc(colRef, { ...product, createdAt: Date.now() });
    },
    update: async (id: string, data: Partial<Product>) => {
      const docRef = doc(dbFirestore, 'artifacts', appId, 'public', 'data', 'products', id);
      return await updateDoc(docRef, { ...data, updatedAt: Date.now() });
    },
    delete: async (id: string) => {
      const docRef = doc(dbFirestore, 'artifacts', appId, 'public', 'data', 'products', id);
      return await deleteDoc(docRef);
    }
  },
  sales: {
    add: async (sale: Omit<Sale, 'id'>) => {
      const colRef = collection(dbFirestore, 'artifacts', appId, 'public', 'data', 'sales');
      return await addDoc(colRef, { ...sale, date: Date.now() });
    }
  }
};
