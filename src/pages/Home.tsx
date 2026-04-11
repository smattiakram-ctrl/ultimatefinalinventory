import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getProducts, getSales, searchProducts, updateProduct } from '../db';
import { Product } from '../db';
import { Package, Tags, ShoppingCart, Search, PlusCircle, TrendingUp, AlertTriangle, Bot, Send, X, Edit, Save, Camera, Image as ImageIcon } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export function Home() {
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [totalSalesAmount, setTotalSalesAmount] = useState(0);
  const [todaySalesAmount, setTodaySalesAmount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  // ✅ حالة النافذة المنبثقة للمنتج
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [showAI, setShowAI] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك في إدارة متجرك؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getProducts(), getCategories()]).then(([products, categories]) => {
      setProductCount(products.length);
      setCategoryCount(categories.length);
      const batteryCategory = categories.find(c => c.name === 'بطاريات الهاتف');
      const lowStock = products.filter(p =>
        p.quantity !== undefined &&
        p.quantity <= 1 &&
        p.categoryId !== batteryCategory?.id
      ).length;
      setLowStockCount(lowStock);
    });

    getSales().then(sales => {
      const total = sales.reduce((sum, sale) => sum + (sale.sellingPrice || 0), 0);
      setTotalSalesAmount(total);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTotal = sales
        .filter(sale => new Date(sale.date) >= today)
        .reduce((sum, sale) => sum + (sale.sellingPrice || 0), 0);
      setTodaySalesAmount(todayTotal);
    });
  }, []);

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      searchProducts(searchQuery).then(setSearchResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ فتح نافذة تفاصيل المنتج
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setEditedProduct({ ...product });
    setIsEditing(false);
    setSaveMessage('');
  };

  // ✅ إغلاق النافذة
  const closeModal = () => {
    setSelectedProduct(null);
    setEditedProduct(null);
    setIsEditing(false);
    setSaveMessage('');
  };

  // ✅ تفعيل وضع التعديل
  const startEditing = () => {
    setIsEditing(true);
    setSaveMessage('');
  };

  // ✅ حفظ التعديلات
  const handleSave = async () => {
    if (!editedProduct || !selectedProduct) return;
    
    setSaveLoading(true);
    try {
      await updateProduct(selectedProduct.id!, {
        name: editedProduct.name,
        quantity: editedProduct.quantity,
        wholesalePrice: editedProduct.wholesalePrice,
        retailPrice: editedProduct.retailPrice,
        barcode: editedProduct.barcode,
      });
      
      // ✅ تحديث القائمة المحلية
      setSelectedProduct({ ...editedProduct });
      setIsEditing(false);
      setSaveMessage('✅ تم حفظ التعديلات بنجاح');
      
      // ✅ تحديث نتائج البحث
      const results = await searchProducts(searchQuery);
      setSearchResults(results);
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ فشل في حفظ التعديلات');
    } finally {
      setSaveLoading(false);
    }
  };

  // ✅ تحديث قيمة في النموذج
  const handleChange = (field: keyof Product, value: any) => {
    if (!editedProduct) return;
    setEditedProduct({
      ...editedProduct,
      [field]: value
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', res.status, errorData);
        
        if (res.status === 429) {
          throw new Error('تم تجاوز الحصة المجانية. يرجى الانتظار.');
        }
        throw new Error(errorData.error || `خطأ HTTP: ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.response || 'لم أتمكن من الرد.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (error: any) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `⚠️ ${error.message || 'حدث خطأ في الاتصال.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">نظرة عامة</h1>
          <p className="text-gray-500 mt-1">مرحباً بك في لوحة تحكم متجرك السحابية</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowAI(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition"
          >
            <Bot size={20} />
            <span>مساعد ذكي</span>
          </button>
          <Link to="/categories" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
            <PlusCircle size={20} />
            <span>المخزن</span>
          </Link>
          <Link to="/sell" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition">
            <ShoppingCart size={20} />
            <span>بيع سريع</span>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Package size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي السلع</p>
            <p className="text-xl font-bold text-gray-900">{productCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Tags size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">الأصناف</p>
            <p className="text-xl font-bold text-gray-900">{categoryCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600"><TrendingUp size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي المبيعات</p>
            <p className="text-xl font-bold text-gray-900">{totalSalesAmount} د.ج</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><ShoppingCart size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">مبيعات اليوم</p>
            <p className="text-xl font-bold text-gray-900">{todaySalesAmount} د.ج</p>
          </div>
        </div>
        <Link to="/low-stock" className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-orange-50 transition cursor-pointer">
          <div className="bg-orange-100 p-3 rounded-lg text-orange-600"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">سلع منخفضة المخزون</p>
            <p className="text-xl font-bold text-gray-900">{lowStockCount}</p>
          </div>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">البحث عن السلع</h2>
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            placeholder="ابحث بالاسم أو الباركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <div className="mt-4">
            {searchResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد نتائج مطابقة</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الباركود</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر (تفصيل)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((product) => (
                      <tr 
                        key={product.id} 
                        onClick={() => handleProductClick(product)}
                        className="hover:bg-blue-50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{product.barcode || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (product.quantity || 0) <= 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {product.quantity || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{product.retailPrice ? `${product.retailPrice} د.ج` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ نافذة تفاصيل المنتج المنبثقة */}
      {selectedProduct && editedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'تعديل السلعة' : 'تفاصيل السلعة'}
              </h2>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button 
                    onClick={startEditing}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Edit size={18} />
                    <span>تعديل</span>
                  </button>
                ) : (
                  <button 
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <Save size={18} />
                    <span>{saveLoading ? 'جاري الحفظ...' : 'حفظ'}</span>
                  </button>
                )}
                <button 
                  onClick={closeModal}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* رسالة النجاح/الخطأ */}
            {saveMessage && (
              <div className={`mx-6 mt-4 p-3 rounded-lg text-center font-medium ${
                saveMessage.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* صورة المنتج */}
            <div className="p-6">
              <div className="flex justify-center mb-6">
                {selectedProduct.image ? (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name} 
                    className="w-32 h-32 object-cover rounded-xl border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-400">
                    <ImageIcon size={48} />
                  </div>
                )}
              </div>

              {/* تفاصيل المنتج */}
              <div className="space-y-4">
                {/* اسم المنتج */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم السلعة</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProduct.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded-lg text-gray-900 font-medium">{selectedProduct.name}</p>
                  )}
                </div>

                {/* الكمية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المتوفرة</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedProduct.quantity ?? ''}
                      onChange={(e) => handleChange('quantity', e.target.value ? Number(e.target.value) : 0)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    <p className={`p-3 rounded-lg font-medium ${
                      (selectedProduct.quantity || 0) <= 1 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {selectedProduct.quantity || 0} قطعة
                    </p>
                  )}
                </div>

                {/* الأسعار */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">سعر الجملة</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedProduct.wholesalePrice ?? ''}
                        onChange={(e) => handleChange('wholesalePrice', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg text-gray-900">
                        {selectedProduct.wholesalePrice ? `${selectedProduct.wholesalePrice} د.ج` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">سعر التفصيل</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedProduct.retailPrice ?? ''}
                        onChange={(e) => handleChange('retailPrice', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    ) : (
                      <p className="p-3 bg-green-50 rounded-lg text-green-700 font-bold">
                        {selectedProduct.retailPrice ? `${selectedProduct.retailPrice} د.ج` : '-'}
                      </p>
                    )}
                  </div>
                </div>

                {/* الباركود */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedProduct.barcode || ''}
                        onChange={(e) => handleChange('barcode', e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                      />
                      <button 
                        className="bg-gray-100 p-3 rounded-lg hover:bg-gray-200 transition"
                        title="مسح الباركود"
                      >
                        <Camera size={20} className="text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <p className="p-3 bg-gray-50 rounded-lg text-gray-900 font-mono">
                      {selectedProduct.barcode || '-'}
                    </p>
                  )}
                </div>

                {/* معلومات إضافية */}
                {!isEditing && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">معرف المنتج:</span>
                        <span className="mr-2 font-mono text-gray-700">{selectedProduct.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">الصنف:</span>
                        <span className="mr-2 text-gray-700">{selectedProduct.categoryId || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار في الأسفل */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                    >
                      {saveLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEditedProduct({ ...selectedProduct });
                        setSaveMessage('');
                      }}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <Link 
                    to={`/categories/${selectedProduct.categoryId}`}
                    onClick={closeModal}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition text-center font-medium"
                  >
                    الذهاب للصنف
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAI && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ height: '520px' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-purple-600 rounded-t-2xl">
              <div className="flex items-center gap-2 text-white">
                <Bot size={22} />
                <span className="font-bold text-lg">المساعد الذكي</span>
                <span className="text-xs bg-purple-500 px-2 py-0.5 rounded-full">Gemini 2.5</span>
              </div>
              <button onClick={() => setShowAI(false)} className="text-white hover:text-purple-200 transition">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gray-100 text-gray-800 rounded-tr-sm'
                      : 'bg-purple-600 text-white rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-purple-100 text-purple-600 px-4 py-2 rounded-2xl text-sm animate-pulse">
                    جاري التفكير...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="اكتب سؤالك هنا..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
