import React, { useState } from 'react';
/**
 * تم تعديل الاستيراد ليكون متوافقاً مع المسار الصحيح لملف db.ts في مشروعك.
 * نستخدم هنا useLiveQuery المخصص الذي أنشأناه في ملف db لضمان التوافق مع السحابة.
 */
import { useLiveQuery, db, Category } from '../db';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Edit, Trash2, Tags } from 'lucide-react';

export function Categories() {
  // جلب الأصناف من قاعدة البيانات السحابية
  const categories = useLiveQuery(() => db.categories.toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    if (editingId) {
      await db.categories.update(editingId, { name, image });
    } else {
      await db.categories.add({ name, image });
    }
    
    resetForm();
  };

  const handleEdit = (category: Category) => {
    // نستخدم id كـ string للتوافق مع بنية المعرفات الفريدة (UUID)
    setEditingId(category.id || null);
    setName(category.name);
    setImage(category.image || '');
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟ سيتم حذف جميع السلع المرتبطة به أيضاً.')) {
      await db.categories.delete(id);
      // حذف المنتجات المرتبطة بهذا الصنف
      const products = await db.products.where('categoryId').equals(id).toArray();
      for (const p of products) {
        if (p.id) await db.products.delete(p.id);
      }
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setImage('');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">الأصناف</h1>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            <span>إضافة صنف</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">{editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="مثال: إلكترونيات، ملابس..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">صورة الصنف (اختياري)</label>
              <div className="flex items-center gap-4">
                {image ? (
                  <img src={image} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                )}
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition">
                  اختر صورة
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {image && (
                  <button onClick={() => setImage('')} className="text-red-500 hover:text-red-700 text-sm">
                    إزالة الصورة
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={handleSave}
                disabled={!name.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                حفظ
              </button>
              <button 
                onClick={resetForm}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories?.map((category) => (
          <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
            <Link to={`/categories/${category.id}`} className="block relative h-48 bg-gray-100">
              {category.image ? (
                <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Tags size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-full">عرض السلع</span>
              </div>
            </Link>
            <div className="p-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg truncate">{category.name}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(category)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="تعديل"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(category.id!)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {categories?.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Tags size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">لا توجد أصناف حالياً</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              أضف صنفك الأول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
