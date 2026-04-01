import React, { useState, useEffect } from 'react';
import { Category, getCategories, addProduct, uploadImage } from '../db';
import { Camera, Image as ImageIcon, Save, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

export function AddProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [retailPrice, setRetailPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      setScanner(newScanner);
      newScanner.render(
        (decodedText) => { setBarcode(decodedText); newScanner.clear(); setIsScanning(false); },
        (error) => { console.warn(error); }
      );
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) scanner.clear();
    setIsScanning(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !categoryId) {
      alert('يرجى إدخال اسم السلعة واختيار الصنف');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = image;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (uploaded) imageUrl = uploaded;
      }
      await addProduct({
        categoryId,
        name,
        wholesalePrice: wholesalePrice === '' ? undefined : Number(wholesalePrice),
        retailPrice: retailPrice === '' ? undefined : Number(retailPrice),
        quantity: quantity === '' ? 0 : Number(quantity),
        barcode: barcode || undefined,
        image: imageUrl || undefined,
      });
      navigate(`/categories/${categoryId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">إضافة سلعة جديدة</h1>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">الصنف *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">-- اختر الصنف --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {categories.length === 0 && <p className="text-sm text-red-500 mt-2">يرجى إضافة صنف أولاً من صفحة الأصناف.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اسم السلعة *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="مثال: هاتف ذكي..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الكمية</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">سعر الجملة (د.ج)</label>
            <input type="number" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">سعر التفصيل / البيع (د.ج)</label>
            <input type="number" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">الباركود</label>
            <div className="flex gap-2">
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="أدخل الباركود يدوياً أو استخدم الكاميرا" />
              <button onClick={startScanner} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 font-medium">
                <Camera size={20} /> مسح
              </button>
            </div>
            {isScanning && (
              <div className="mt-4 border rounded-lg overflow-hidden bg-gray-50 p-4">
                <div id="reader" className="w-full max-w-sm mx-auto bg-white rounded-lg overflow-hidden"></div>
                <button onClick={stopScanner} className="w-full mt-4 bg-red-100 text-red-600 py-3 rounded-lg font-medium hover:bg-red-200 transition flex items-center justify-center gap-2">
                  <X size={20} /> إلغاء المسح
                </button>
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">صورة السلعة (اختياري)</label>
            <div className="flex items-center gap-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              {image ? (
                <img src={image} alt="Preview" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
              ) : (
                <div className="w-24 h-24 bg-white rounded-lg border flex items-center justify-center text-gray-400 shadow-sm"><ImageIcon size={32} /></div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition font-medium text-center shadow-sm">
                  اختر صورة
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {image && <button onClick={() => { setImage(''); setImageFile(null); }} className="text-red-500 hover:text-red-700 text-sm font-medium">إزالة الصورة</button>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 pt-8 mt-8 border-t border-gray-100">
          <button onClick={handleSave} disabled={!name.trim() || !categoryId || loading}
            className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-lg font-bold flex items-center justify-center gap-2 shadow-sm">
            <Save size={24} /> {loading ? 'جاري الحفظ...' : 'حفظ السلعة'}
          </button>
          <button onClick={() => navigate(-1)} className="bg-gray-100 text-gray-800 px-8 py-4 rounded-lg hover:bg-gray-200 transition text-lg font-medium">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
