import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCategories, getProducts, getSales, searchProducts } from '../db';
import { Package, Tags, ShoppingCart, Search, PlusCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { startOfDay } from 'date-fns';
  // جلب إحصائيات المنتجات والأصناف سحابياً
  const [productCount, setProductCount] = useState(0);
const [categoryCount, setCategoryCount] = useState(0);

useEffect(() => {
  // جلب المنتجات
  getProducts().then(products => setProductCount(products.length));

  // جلب الأصناف
  getCategories().then(categories => setCategoryCount(categories.length));
}, []);
const [totalSalesAmount, setTotalSalesAmount] = useState(0);
const [todaySalesAmount, setTodaySalesAmount] = useState(0);
const [lowStockCount, setLowStockCount] = useState(0);
const [searchResults, setSearchResults] = useState<Product[]>([]);

useEffect(() => {
  // إجمالي المبيعات
  getSales().then(sales => {
    const total = sales.reduce((sum, sale) => sum + (sale.sellingPrice || 0), 0);
    setTotalSalesAmount(total);
    });
  }, []); 
}

    // مبيعات اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0); // بداية اليوم
    const todayTotal = sales
      .filter(sale => new Date(sale.date) >= today)
      .reduce((sum, sale) => sum + (sale.sellingPrice || 0), 0);
    setTodaySalesAmount(todayTotal);
  });

  // المنتجات منخفضة المخزون
  getProducts().then(products => {
    const lowStock = products.filter(p => p.quantity !== undefined && p.quantity <= 5).length;
    setLowStockCount(lowStock);
  });
}, []);

// البحث السحابي
useEffect(() => {
  if (!searchQuery) {
    setSearchResults([]);
    return;
  }

export function Home() {
  const navigate = useNavigate(); 
    useEffect(() => {
    if (searchQuery) {
      searchProducts(searchQuery).then(results => setSearchResults(results));
    }
  }, [searchQuery]);
  return (
    // ...
  );
}
  return (
    <div className="space-y-8" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">نظرة عامة</h1>
          <p className="text-gray-500 mt-1">مرحباً بك في لوحة تحكم متجرك السحابية</p>
        </div>
        <div className="flex gap-3">
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
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي السلع</p>
            <p className="text-xl font-bold text-gray-900">{productCount ?? 0}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
            <Tags size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">الأصناف</p>
            <p className="text-xl font-bold text-gray-900">{categoryCount ?? 0}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي المبيعات</p>
            <p className="text-xl font-bold text-gray-900">{totalSalesAmount ?? 0} د.ج</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">مبيعات اليوم</p>
            <p className="text-xl font-bold text-gray-900">{todaySalesAmount ?? 0} د.ج</p>
          </div>
        </div>
       {/* أضفنا cursor-pointer و onClick و hover للتفاعل */}
<div 
  onClick={() => navigate('/low-stock')} 
  className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-orange-50 transition-colors group"
>
  <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:bg-orange-200 transition-colors">
    <AlertTriangle size={24} />
  </div>
  <div>
    <p className="text-xs text-gray-500 font-medium">سلع منخفضة المخزون</p>
    <p className="text-xl font-bold text-gray-900">{lowStockCount ?? 0}</p>
  </div>
</div>
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
            {searchResults === undefined ? (
              <p className="text-gray-500 text-center py-4">جاري البحث...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد نتائج مطابقة</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الباركود</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر (تفصيل)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((product: any) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.barcode || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.quantity || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.retailPrice ? `${product.retailPrice} د.ج` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
