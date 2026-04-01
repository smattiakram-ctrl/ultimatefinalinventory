import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Edit, Trash2, Tags, Loader2, ChevronLeft, AlertCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
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

  // 2. جلب البيانات (Real-time Fetching)
  useEffect(() => {
    if (!user) return;

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Category[];
        // ترتيب الأصناف حسب تاريخ الإضافة (الأحدث أولاً)
        setCategories(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        setLoading(false);
      }, 
      (err) => {
        console.error("Firestore error:", err);
        setError("تعذر تحميل البيانات من السحابة");
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
      setError("حدث خطأ أثناء محاولة الحفظ");
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
      alert("تعذر حذف الصنف");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Tags className="text-blue-600" size={32} />
            الأصناف
          </h1>
          <p className="text-gray-500 mt-1 text-sm">إدارة وتصنيف المنتجات في متجرك السحابي</p>
        </div>
        
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold">إضافة صنف جديد</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* نموذج الإضافة/التعديل */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-50 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {editingId ? 'تعديل بيانات الصنف' : 'بيانات الصنف الجديد'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">إلغاء</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">اسم الصنف</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-right"
                  placeholder="مثال: إلكترونيات، ملابس..."
                  disabled={isSaving}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleSave}
                  disabled={!name.trim() || isSaving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-bold flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : (editingId ? 'تحديث' : 'حفظ')}
                </button>
                <button 
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  تراجع
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl p-4 bg-gray-50/50">
              <div className="relative group">
                {image ? (
                  <div className="relative">
                    <img src={image} alt="Preview" className="w-32 h-32 object-cover rounded-2xl border-4 border-white shadow-md" />
                    <button 
                      onClick={() => setImage('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <ImageIcon size={32} />
                    <span className="text-[10px]">لا توجد صورة</span>
                  </div>
                )}
              </div>
              <label className="mt-4 cursor-pointer text-blue-600 text-sm font-bold hover:underline">
                اختر صورة
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* عرض الأصناف */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-gray-500">جاري جلب الأصناف من السحابة...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
              <Link to={`/categories/${category.id}`} className="block relative h-40 bg-gray-50 overflow-hidden">
                {category.image ? (
                  <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <Tags size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
              </Link>
              
              <div className="p-4 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg truncate flex-1 text-right">{category.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(category)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(category.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && !isAdding && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Tags size={48} className="text-gray-200" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">قائمة الأصناف فارغة</h2>
              <p className="text-gray-500 mt-2 mb-6 text-center">ابدأ بإضافة أصناف لترتيب منتجاتك بشكل أفضل في السحاب</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
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
