import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../db';
import { Plus, ArrowRight, Edit, Trash2, Package, Camera, Image as ImageIcon } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function CategoryProducts() {
  const { id } = useParams<{ id: string }>();
  const categoryId = parseInt(id || '0');
  
  const category = useLiveQuery(() => db.categories.get(categoryId), [categoryId]);
  const products = useLiveQuery(() => db.products.where('categoryId').equals(categoryId).toArray(), [categoryId]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [retailPrice, setRetailPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState('');
  const [isScanning, setIsScanning] = useState(false);

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

  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      setScanner(newScanner);
      newScanner.render(
        (decodedText) => {
          setBarcode(decodedText);
          newScanner.clear();
          setIsScanning(false);
        },
        (error) => {
          console.warn(error);
        }
      );
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
    }
    setIsScanning(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    const productData = {
      categoryId,
      name,
      wholesalePrice: wholesalePrice === '' ? undefined : Number(wholesalePrice),
      retailPrice: retailPrice === '' ? undefined : Number(retailPrice),
      quantity: quantity === '' ? undefined : Number(quantity),
      barcode: barcode || undefined,
      image: image || undefined
    };

    if (editingId) {
      await db.products.update(editingId, productData);
    } else {
      await db.products.add(productData);
    }
    
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id!);
    setName(product.name);
    setWholesalePrice(product.wholesalePrice ?? '');
    setRetailPrice(product.retailPrice ?? '');
    setQuantity(product.quantity ?? '');
    setBarcode(product.barcode || '');
    setImage(product.image || '');
    setIsAdding(true);
  };

  const handleDelete = async (productId: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذه السلعة؟')) {
      await db.products.delete(productId);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setWholesalePrice('');
    setRetailPrice('');
    setQuantity('');
    setBarcode('');
    setImage('');
    setIsScanning(false);
  };

  if (!category) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/categories" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition">
          <ArrowRight size={24} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">سلع صنف: {category.name}</h1>
        <div className="flex-1" />
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            <span>إضافة سلعة</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">{editingId ? 'تعديل السلعة' : 'إضافة سلعة جديدة'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم السلعة *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="مثال: هاتف ذكي..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر الجملة</label>
              <input
                type="number"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر التفصيل (البيع)</label>
              <input
                type="number"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="أدخل الباركود يدوياً أو استخدم الكاميرا"
                />
                <button 
                  onClick={startScanner}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                >
                  <Camera size={20} />
                  مسح
                </button>
              </div>
              {isScanning && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div id="reader" className="w-full max-w-sm mx-auto"></div>
                  <button 
                    onClick={stopScanner}
                    className="w-full bg-red-100 text-red-600 py-2 font-medium hover:bg-red-200 transition"
                  >
                    إلغاء المسح
                  </button>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">صورة السلعة (اختياري)</label>
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
          </div>
          <div className="flex gap-3 pt-6 mt-4 border-t border-gray-100">
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products?.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="h-40 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={48} className="text-gray-300" />
              )}
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-gray-700 shadow-sm">
                الكمية: {product.quantity || 0}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">{product.name}</h3>
              <div className="space-y-1 text-sm text-gray-600 mb-4 flex-1">
                <div className="flex justify-between">
                  <span>سعر الجملة:</span>
                  <span className="font-medium">{product.wholesalePrice ? `${product.wholesalePrice} د.ج` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>سعر التفصيل:</span>
                  <span className="font-medium text-green-600">{product.retailPrice ? `${product.retailPrice} د.ج` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>الباركود:</span>
                  <span className="font-mono text-xs">{product.barcode || '-'}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => handleEdit(product)}
                  className="flex-1 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex justify-center items-center gap-2"
                >
                  <Edit size={16} />
                  تعديل
                </button>
                <button 
                  onClick={() => handleDelete(product.id!)}
                  className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {products?.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">لا توجد سلع في هذا الصنف</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              أضف سلعتك الأولى
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
