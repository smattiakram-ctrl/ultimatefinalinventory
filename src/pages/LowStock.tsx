import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, getCategories } from '../db';  // ✅ أضف getCategories
import { Product } from '../db';
import { AlertTriangle, ArrowRight, Package } from 'lucide-react';

export function LowStock() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // ✅ جلب المنتجات والأصناف معاً
    Promise.all([getProducts(), getCategories()]).then(([all, categories]) => {
      // ✅ إيجاد صنف "بطاريات الهاتف"
      const batteryCategory = categories.find(c => 
        c.name === 'بطاريات الهاتف'
      );
      
      // ✅ تصفية المنتجات واستثناء البطاريات
      const low = all.filter(p => 
        p.quantity !== undefined && 
        Number(p.quantity) <= 1 &&
        p.categoryId !== batteryCategory?.id  // استثناء حسب categoryId
      );
      
      setProducts(low);
    });
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition">
          <ArrowRight size={24} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
          <AlertTriangle size={28} /> سلع منخفضة المخزون
        </h1>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">لا توجد سلع منخفضة المخزون</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden flex flex-col">
              <div className="h-40 bg-gray-50 flex items-center justify-center relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={48} className="text-gray-300" />
                )}
                <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                  الكمية: {product.quantity}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-lg truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">سعر البيع: {product.retailPrice ? `${product.retailPrice} د.ج` : '-'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
