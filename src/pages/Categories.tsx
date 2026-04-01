import React, { useState } from 'react';
import { db, Category, useLiveQuery } from '../db';
import { Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Edit, Trash2, Tags, X, Save, Loader2 } from 'lucide-react';

export function Categories() {
  // استخدام useLiveQuery المخصص من db.ts لضمان استقرار البناء
  const categories = useLiveQuery<Category>('categories');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("حجم الصورة كبير جداً (الأقصى 800 كيلوبايت)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setName('');
    setImage('');
    setEditingId(null);
    setIsAdding(false);
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      if (editingId) {
        await db.categories.update(editingId, { name: name.trim(), image });
      } else {
        await db.categories.add({ name: name.trim(), image });
      }
      resetForm();
    } catch (error) {
      console.error("خطأ في حفظ الصنف:", error);
      alert("حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.");
      setIsSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id!);
    setName(category.name);
    setImage(category.image || '');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      try {
        await db.categories.delete(id);
      } catch (error) {
        console.error("خطأ في حذف الصنف:", error);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 text-right">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Tags className="text-blue-600" size={36} />
            أصناف المنتجات
          </h1>
          <p className="text-gray-500 mt-1 font-medium">إدارة وتصنيف مخزونك سحابياً</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            <Plus size={24} />
            إضافة صنف جديد
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-10 bg-white p-8 rounded-[3rem] shadow-2xl border border-blue-50 animate-in fade-in slide-in-from-top-4 duration-300 text-right">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-800">
              {editingId ? 'تعديل الصنف' : 'بيانات الصنف الجديد'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={32} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 mr-2">اسم الصنف</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent p-5 rounded-[1.5rem] focus:bg-white focus:border-blue-500 outline-none font-bold text-gray-800 transition-all text-right text-lg"
                  placeholder="مثال: مشروبات، إلكترونيات..."
                  disabled={isSaving}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || isSaving}
                  className={`flex-1 bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all ${isSaving ? 'opacity-50' : 'hover:bg-blue-700 active:scale-95'}`}
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                  {isSaving ? 'جاري الحفظ...' : (editingId ? 'تحديث البيانات' : 'حفظ في السحاب')}
                </button>
                <button
                  onClick={resetForm}
                  className="px-10 py-5 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black hover:bg-gray-200 transition-all"
                >
                  تراجع
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <label className="block w-full text-sm font-black text-gray-700 mb-2 mr-2 text-right">صورة الصنف</label>
              <div 
                className="w-full h-64 bg-gray-50 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden relative group"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {image ? (
                  <>
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="text-white" size={48} />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <ImageIcon size={40} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-black">اضغط هنا لرفع صورة الصنف</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {categories === undefined ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
          <Loader2 className="animate-spin text-blue-600 mb-6" size={64} />
          <p className="font-black text-gray-400 text-xl">جاري مزامنة بياناتك مع السحاب...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <Link to={`/category/${category.id}`} className="block relative h-56 overflow-hidden bg-gray-50">
                {category.image ? (
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <Tags size={64} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
                  <span className="bg-white text-blue-600 font-black px-8 py-3 rounded-2xl text-sm shadow-xl">عرض المنتجات</span>
                </div>
              </Link>
              <div className="p-6 flex justify-between items-center bg-white relative z-10">
                <h3 className="font-black text-gray-800 text-xl truncate text-right flex-1">{category.name}</h3>
                <div className="flex gap-2 mr-4">
                  <button 
                    onClick={() => handleEdit(category)}
                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                    title="تعديل"
                  >
                    <Edit size={22} />
                  </button>
                  <button 
                    onClick={() => handleDelete(category.id!)}
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    title="حذف"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {categories.length === 0 && !isAdding && (
            <div className="col-span-full text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-gray-50">
              <div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Tags size={48} className="text-blue-200" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">لا توجد أصناف في السحاب</h2>
              <p className="text-gray-400 text-lg font-bold max-w-sm mx-auto mb-8">ابدأ بإضافة أول صنف لترتيب منتجاتك ومزامنتها عبر جميع أجهزتك</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 text-white px-10 py-4 rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
              >
                أضف صنفك الأول الآن
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Categories;
