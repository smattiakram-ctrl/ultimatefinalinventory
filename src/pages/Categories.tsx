import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Edit, Trash2, Tags, X, Save, Loader2, AlertCircle } from 'lucide-react';
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

// --- إعدادات Firebase والبيئة ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- تعريف الأنواع ---
interface Category {
  id?: string;
  name: string;
  image?: string;
  createdAt?: number;
}

export function Categories() {
  // --- حالة البيانات والمستخدم ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // --- حالة النموذج (Form State) ---
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // 1. إدارة المصادقة (Authentication)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب البيانات من السحاب (Real-time Fetching)
  useEffect(() => {
    if (!user) return;

    // جلب البيانات من المسار المحدد في القواعد
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
    
    const unsubscribe = onSnapshot(colRef, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Category[];
        
        // ترتيب البيانات يدوياً (الأحدث أولاً)
        setCategories(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        setLoading(false);
      }, 
      (err) => {
        console.error("Firestore error:", err);
        setError("فشل الاتصال بالسحاب. تأكد من إعدادات الوصول.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- الوظائف (Actions) ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("حجم الصورة كبير جداً (الأقصى 800 كيلوبايت)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    
    setIsSaving(true);
    setError(null);
    try {
      const categoryData = {
        name: name.trim(),
        image: image || '',
        updatedAt: Date.now()
      };

      if (editingId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'categories', editingId);
        await updateDoc(docRef, categoryData);
      } else {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
        await addDoc(colRef, { ...categoryData, createdAt: Date.now() });
      }
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
      setError("حدث خطأ أثناء محاولة الحفظ السحابي");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id || null);
    setName(category.name);
    setImage(category.image || '');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'categories', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Delete error:", err);
      alert("فشل في حذف الصنف من السحاب");
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setImage('');
    setIsSaving(false);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans" dir="rtl">
      {/* الرأس */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-right">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Tags className="text-blue-600" size={32} />
            أصناف المنتجات
          </h1>
          <p className="text-gray-500 mt-1 text-sm">إدارة السلع وتصنيفها سحابياً</p>
        </div>
        
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold">إضافة صنف جديد</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* نموذج الإضافة والتعديل */}
      {isAdding && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-blue-50 mb-10 animate-in fade-in slide-in-from-top-4 duration-300 text-right">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-gray-800">
              {editingId ? 'تحديث الصنف' : 'صنف جديد'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={28} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">اسم الصنف</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                  placeholder="مثال: مشروبات، منظفات..."
                  disabled={isSaving}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={handleSave}
                  disabled={!name.trim() || isSaving}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : (editingId ? 'تحديث البيانات' : 'حفظ في السحاب')}
                </button>
                <button 
                  onClick={resetForm}
                  className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all font-bold"
                >
                  تراجع
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-[2rem] p-6 bg-gray-50/50 group relative">
              {image ? (
                <div className="relative w-40 h-40">
                  <img src={image} alt="Preview" className="w-full h-full object-cover rounded-3xl border-4 border-white shadow-xl" />
                  <button 
                    onClick={() => setImage('')}
                    className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-40 h-40 bg-white rounded-3xl border border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-3">
                  <ImageIcon size={48} />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">بدون صورة</span>
                </div>
              )}
              <label className="mt-6 cursor-pointer bg-white px-6 py-2 rounded-full text-blue-600 text-sm font-black border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                تحميل صورة
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* عرض القائمة */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] shadow-sm">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={50} />
          <p className="text-gray-400 font-bold">جاري مزامنة بياناتك مع السحاب...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <Link to={`/categories/${category.id}`} className="block relative h-48 bg-gray-50 overflow-hidden">
                {category.image ? (
                  <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-100 bg-gradient-to-br from-gray-50 to-gray-100">
                    <Tags size={60} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all"></div>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-blue-600 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                  استكشاف المنتجات
                </div>
              </Link>
              
              <div className="p-6 flex items-center justify-between">
                <h3 className="font-black text-gray-900 text-xl truncate flex-1 text-right">{category.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(category)} className="p-3 text-blue-500 hover:bg-blue-50 rounded-2xl transition-colors">
                    <Edit size={20} />
                  </button>
                  <button onClick={() => handleDelete(category.id!)} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && !isAdding && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-gray-50">
              <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Tags size={60} className="text-blue-200" />
              </div>
              <h2 className="text-3xl font-black text-gray-900">المتجر السحابي فارغ</h2>
              <p className="text-gray-400 mt-3 mb-8 text-center max-w-sm font-medium">ابدأ الآن بإضافة أول صنف لترتيب منتجاتك ومزامنتها عبر جميع أجهزتك</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 text-white px-10 py-4 rounded-3xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
              >
                أضف أول صنف الآن
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Categories;
