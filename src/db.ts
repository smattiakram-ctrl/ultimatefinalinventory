import { useState, useEffect } from 'react';

// استخدام استيراد ديناميكي للوحدات لضمان عدم تعارضها مع عملية البناء
// سنعتمد على مكتبات Firebase الرسمية عبر CDN لضمان التوافق التام
const FIREBASE_SDK_VERSION = '11.0.1';

// أنواع البيانات
export interface Category {
  id?: string;
  name: string;
  image?: string;
  createdAt?: number;
}

export interface Product {
  id?: string;
  categoryId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
  minLimit?: number;
  createdAt?: number;
}

// واجهة الخدمات التي سنستخدمها - تم تغيير الاسم لتجنب التعارض
let firestoreInstance: any = null;
let authInstance: any = null;
let sdkFunctions: any = null;

// دالة تهيئة Firebase بشكل آمن
const initFirebase = async () => {
  if (firestoreInstance) return { db: firestoreInstance, auth: authInstance };

  try {
    // تحميل المكتبات ديناميكياً لتجنب مشاكل Vite Build
    const [
      { initializeApp },
      { getAuth, signInAnonymously, onAuthStateChanged },
      { getFirestore, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, doc }
    ] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]);

    // @ts-ignore
    const firebaseConfig = JSON.parse(window.__firebase_config || '{}');
    // @ts-ignore
    const appId = window.__app_id || 'inventory-app';

    const app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    firestoreInstance = getFirestore(app);
    sdkFunctions = { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, doc };

    // تسجيل الدخول بشكل مجهول لضمان الوصول للبيانات وفقاً للقواعد
    await signInAnonymously(authInstance);
    
    return { db: firestoreInstance, auth: authInstance, sdk: sdkFunctions, appId };
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    return null;
  }
};

// Hook مخصص لجلب البيانات الحية من السحاب
export function useLiveQuery<T>(collectionName: string) {
  const [data, setData] = useState<T[] | undefined>(undefined);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const startListening = async () => {
      const fb = await initFirebase();
      if (!fb) {
        setData([]);
        return;
      }

      const { db, sdk, appId, auth } = fb;
      
      // ننتظر التأكد من وجود مستخدم (Auth Rule 3)
      const user = auth.currentUser;
      if (!user) return;

      const q = sdk.query(
        sdk.collection(db, 'artifacts', appId, 'public', 'data', collectionName)
      );

      unsubscribe = sdk.onSnapshot(q, (snapshot: any) => {
        const items = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(items);
      }, (error: any) => {
        console.error(`Error fetching ${collectionName}:`, error);
        setData([]);
      });
    };

    startListening();
    return () => unsubscribe();
  }, [collectionName]);

  return data;
}

// محرك العمليات (الأساسي) الذي يتم تصديره باسم db
export const db = {
  categories: {
    add: async (data: Category) => {
      const fb = await initFirebase();
      if (!fb) return;
      const { db, sdk, appId } = fb;
      return sdk.addDoc(
        sdk.collection(db, 'artifacts', appId, 'public', 'data', 'categories'),
        { ...data, createdAt: Date.now() }
      );
    },
    update: async (id: string, data: Partial<Category>) => {
      const fb = await initFirebase();
      if (!fb) return;
      const { db, sdk, appId } = fb;
      return sdk.updateDoc(
        sdk.doc(db, 'artifacts', appId, 'public', 'data', 'categories', id),
        data
      );
    },
    delete: async (id: string) => {
      const fb = await initFirebase();
      if (!fb) return;
      const { db, sdk, appId } = fb;
      return sdk.deleteDoc(
        sdk.doc(db, 'artifacts', appId, 'public', 'data', 'categories', id)
      );
    }
  },
  products: {
    add: async (data: Product) => {
      const fb = await initFirebase();
      if (!fb) return;
      const { db, sdk, appId } = fb;
      return sdk.addDoc(
        sdk.collection(db, 'artifacts', appId, 'public', 'data', 'products'),
        { ...data, createdAt: Date.now() }
      );
    },
    update: async (id: string, data: Partial<Product>) => {
      const fb = await initFirebase();
      if (!fb) return;
      const { db, sdk, appId } = fb;
      return sdk.updateDoc(
        sdk.doc(db, 'artifacts', appId, 'public', 'data', 'products', id),
        data
      );
    },
    delete: async (id: string) => {
      const fb = await initFirebase();
      if (!fb) return;
      const { db, sdk, appId } = fb;
      return sdk.deleteDoc(
        sdk.doc(db, 'artifacts', appId, 'public', 'data', 'products', id)
      );
    }
  }
};
