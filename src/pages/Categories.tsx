import React, { useState } from 'react';
// استخدام الخطاف المخصص من ملف db الخاص بنا بدلاً من المكتبة الخارجية مباشرة لتجنب أخطاء المسارات
import { db, Category, useLiveQuery } from '../db'; 
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Edit, Trash2, Tags, Loader2, ChevronLeft } from 'lucide-react';

export function Categories() {
  // استخدام useLiveQuery الممرر من ملف db.ts الخاص بك
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        // تنبيه بسيط لحجم الصورة
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      if (editingId) {
        // تحديث صنف موجود في Firestore
        await db.categories.update(editingId, { 
          name: name.trim(), 
          image: image || '' 
        });
      } else {
        // إضافة صنف جديد في Firestore
        await db.categories.add({ 
          name: name.trim(), 
          image: image || '' 
        });
      }
      resetForm();
    } catch (error) {
      console.error("فشل الحفظ في قاعدة البيانات:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id || null);
    setName(category.name);
    setImage(category.image || '');
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      try {
        await db.categories.delete(id);
      } catch (error) {
        console.error("فشل عملية الحذف:", error);
      }
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setImage('');
    setIsSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" dir="rtl">
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

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-50 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {editingId ? 'تعديل بيانات الصنف' : 'بيانات الصنف الجديد'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              إغلاق
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الصنف</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-right"
                  placeholder="مثال: إلكترونيات..."
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
                  disabled={isSaving}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  إلغاء
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories?.map((category) => (
          <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <Link to={`/categories/${category.id}`} className="block relative h-40 bg-gray-50 overflow-hidden">
              {category.image ? (
                <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <Tags size={48} />
                </div>
              )}
            </Link>
            
            <div className="p-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg truncate flex-1">{category.name}</h3>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(category)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(category.id!)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Categories;
