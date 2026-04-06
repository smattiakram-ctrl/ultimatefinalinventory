import { useState, useEffect, useCallback } from 'react';
import { Sale, getSales, deleteSale, clearSales, getTotalSales } from '../db';
import { Search, Trash2, Calendar, RefreshCcw, Package } from 'lucide-react';

export function Sales() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalProfits, setTotalProfits] = useState(0);

  const loadSales = useCallback(async () => {
    const [data, total] = await Promise.all([getSales(searchQuery || undefined), getTotalSales()]);
    setSales(data);
    setTotalProfits(total);
  }, [searchQuery]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await deleteSale(id);
      await loadSales();
    }
  };

  const handleResetProfits = async () => {
    if (window.confirm('هل أنت متأكد من تصفير الأرباح؟ سيتم حذف جميع سجلات المبيعات نهائياً!')) {
      await clearSales();
      await loadSales();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('ar-DZ');
    } catch {
      return dateStr;
    }
  };

  // حساب إجمالي الكميات المباعة
  const totalQuantitySold = sales.reduce((sum, sale) => sum + (sale.quantity || 1), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">سجل المبيعات</h1>
        <button 
          onClick={handleResetProfits} 
          className="bg-red-100 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-200 transition font-medium"
        >
          <RefreshCcw size={20} />
          <span>تصفير الأرباح</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">البحث في السجل</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              placeholder="ابحث باسم السلعة..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>
        
        {/* إحصائيات سريعة */}
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center flex-1">
            <p className="text-sm text-green-700 font-medium mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-green-600">{totalProfits ? `${totalProfits} د.ج` : '0 د.ج'}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center flex-1">
            <p className="text-sm text-blue-700 font-medium mb-1">الكميات المباعة</p>
            <p className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-2">
              <Package size={20} />
              {totalQuantitySold}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">لا توجد مبيعات مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السلعة</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سعر الوحدة</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجمالي</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ والوقت</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => {
                  const quantity = sale.quantity || 1;
                  const unitPrice = quantity > 0 ? sale.sellingPrice / quantity : sale.sellingPrice;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{sale.productName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {quantity} وحدة
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{unitPrice.toFixed(0)} د.ج</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{sale.sellingPrice} د.ج</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sale.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => handleDelete(sale.id!)} 
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
