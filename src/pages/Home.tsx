import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getProducts, getSales, searchProducts } from '../db';
import { Product } from '../db';
import { Package, Tags, ShoppingCart, Search, PlusCircle, TrendingUp, AlertTriangle, Bot, Send, X } from 'lucide-react';

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
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      const reply = data?.response || data?.result?.response || 'لم أتمكن من الرد، حاول مجدداً.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ حدث خطأ في الاتصال.' }]);
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

      {/* كروت الإحصائيات */}
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

      {/* قسم البحث */}
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
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{product.barcode || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{product.quantity || 0}</td>
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

      {/* نافذة المساعد الذكي */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ height: '520px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-purple-600 rounded-t-2xl">
              <div className="flex items-center gap-2 text-white">
                <Bot size={22} />
                <span className="font-bold text-lg">المساعد الذكي</span>
              </div>
              <button onClick={() => setShowAI(false)} className="text-white hover:text-purple-200 transition">
                <X size={22} />
              </button>
            </div>

            {/* Messages */}
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
                  <div className="bg-purple-100 text-purple-600 px-4 py-2 rounded-2xl text-sm">
                    جاري التفكير...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
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
