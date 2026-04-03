import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getSalesByCustomer,
  addSale,
  deleteSale,
  updateSalePaymentStatus,
  updateProduct,
  getProducts,
  getLoyalCustomer,
  Sale,
  LoyalCustomer,
  Product,
} from '../db';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle,
  CreditCard,
  User,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Search,
  Package,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceItem {
  tempId: string;
  saleId?: string;
  productId?: string;
  productName: string;
  quantity: number;
  wholesalePrice: number;
  total: number;
}

interface Invoice {
  dateKey: string;
  dateLabel: string;
  items: InvoiceItem[];
  grandTotal: number;
  isPaid: boolean;
  rawSales: Sale[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

const toDateKey = (iso: string) => {
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return iso.slice(0, 10); }
};

const formatDateAr = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── ItemRow Component ───────────────────────────────────────────────────────

interface ItemRowProps {
  item: InvoiceItem;
  allProducts: Product[];
  onChange: (updated: InvoiceItem) => void;
  onRemove: () => void;
}

function ItemRow({ item, allProducts, onChange, onRemove }: ItemRowProps) {
  const [query, setQuery] = useState(item.productName);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ✅ تصحيح: التحقق من وجود منتجات
  const filterProducts = (searchText: string) => {
    console.log('🔍 filterProducts called with:', searchText, 'allProducts count:', allProducts.length);
    
    if (allProducts.length === 0) {
      console.warn('⚠️ allProducts is empty!');
      return [];
    }
    
    // إظهار جميع المنتجات المتوفرة عند التركيز (حتى بدون كتابة)
    if (!searchText.trim()) {
      return allProducts
        .filter(p => (p.quantity || 0) > 0)
        .slice(0, 10);
    }
    
    const lower = searchText.toLowerCase();
    return allProducts
      .filter(p => 
        p.name.toLowerCase().includes(lower) && 
        (p.quantity || 0) > 0
      )
      .slice(0, 8);
  };

  const handleNameChange = (val: string) => {
    setQuery(val);
    onChange({ ...item, productName: val, productId: undefined });
    
    const filtered = filterProducts(val);
    console.log('✅ Filtered suggestions:', filtered.length);
    setSuggestions(filtered);
    setShowSug(filtered.length > 0);
    setHighlighted(-1);
  };

  const pickProduct = (p: Product) => {
    setQuery(p.name);
    setShowSug(false);
    const wp = p.wholesalePrice ?? 0;
    const qty = item.quantity || 1;
    
    onChange({
      ...item,
      productId: p.id,
      productName: p.name,
      wholesalePrice: wp,
      total: wp * qty,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSug) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      pickProduct(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setShowSug(false);
    }
  };

  const handleQty = (val: number) => {
    const q = Math.max(1, val);
    
    if (selectedProduct && q > (selectedProduct.quantity || 0)) {
      alert(`⚠️ المخزون المتاح فقط: ${selectedProduct.quantity} قطعة`);
      return;
    }
    
    onChange({ ...item, quantity: q, total: item.wholesalePrice * q });
  };

  const handlePrice = (val: number) => {
    onChange({ ...item, wholesalePrice: val, total: val * item.quantity });
  };

  const handleTotal = (val: number) => {
    onChange({ ...item, total: val });
  };

  const selectedProduct = item.productId ? allProducts.find(p => p.id === item.productId) : null;

  // ✅ إظهار رسالة إذا لم تكن هناك منتجات
  const noProductsMessage = allProducts.length === 0 ? (
    <div className="absolute z-50 w-full bg-red-50 border border-red-200 rounded-lg shadow-lg mt-1 p-3 text-sm text-red-600">
      ⚠️ لا توجد سلع في المخزون. أضف سلعاً أولاً من صفحة المخزن.
    </div>
  ) : null;

  return (
    <tr className="border-b border-gray-100">
      <td className="p-2">
        <div ref={wrapRef} className="relative">
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              className="w-full py-2 text-sm outline-none bg-transparent"
              placeholder={allProducts.length === 0 ? "لا توجد سلع متاحة..." : "اكتب اسم السلعة..."}
              value={query}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => {
                console.log('🔥 Input focused, loading suggestions...');
                const filtered = filterProducts(query);
                setSuggestions(filtered);
                setShowSug(filtered.length > 0 || allProducts.length === 0);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              disabled={allProducts.length === 0}
            />
          </div>
          
          {/* ✅ رسالة عدم وجود منتجات */}
          {showSug && noProductsMessage}
          
          {showSug && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {suggestions.map((p, idx) => (
                <li
                  key={p.id}
                  onClick={() => pickProduct(p)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition ${
                    idx === highlighted ? 'bg-blue-100 text-blue-900' : 'hover:bg-blue-50'
                  } ${(p.quantity || 0) <= 0 ? 'opacity-50 bg-red-50' : ''}`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-2">
                      {p.name}
                      {(p.quantity || 0) <= 0 && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          نفد المخزون
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      مخزون: {p.quantity ?? 0} | بيع: {p.retailPrice ?? 0} د.ج
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-blue-600">
                      {p.wholesalePrice ?? 0} د.ج
                    </span>
                    <span className="text-xs text-gray-400">سعر الجملة</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          {showSug && query.trim() && suggestions.length === 0 && allProducts.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-3 text-sm text-gray-500">
              لا توجد سلع مطابقة أو المخزون نفد
            </div>
          )}
        </div>
      </td>

      <td className="p-2 w-24">
        <input
          type="number"
          min={1}
          max={selectedProduct?.quantity}
          title={selectedProduct ? `المخزون المتاح: ${selectedProduct.quantity}` : ''}
          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-blue-500"
          value={item.quantity}
          onChange={e => handleQty(Number(e.target.value))}
          disabled={!selectedProduct}
        />
      </td>

      <td className="p-2 w-32">
        <div className="relative">
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-blue-500"
            value={item.wholesalePrice}
            onChange={e => handlePrice(Number(e.target.value))}
            disabled={!selectedProduct}
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">د.ج</span>
        </div>
      </td>

      <td className="p-2 w-32">
        <div className="relative">
          <input
            type="number"
            min={0}
            className="w-full border border-blue-300 bg-blue-50 rounded-lg px-2 py-2 text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
            value={item.total}
            onChange={e => handleTotal(Number(e.target.value))}
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-blue-400">د.ج</span>
        </div>
      </td>

      <td className="p-2 w-10">
        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

// ─── InvoiceForm Component ───────────────────────────────────────────────────

interface InvoiceFormProps {
  customerId: string;
  allProducts: Product[];
  onSaved: () => void;
  onCancel: () => void;
}

function InvoiceForm({ customerId, allProducts: initialProducts, onSaved, onCancel }: InvoiceFormProps) {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<InvoiceItem[]>([
    { tempId: uid(), productName: '', quantity: 1, wholesalePrice: 0, total: 0 }
  ]);
  const [isPaid, setIsPaid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // ✅ تحميل المنتجات عند فتح النموذج إذا كانت فارغة
  useEffect(() => {
    if (allProducts.length === 0) {
      console.log('🔄 Loading products...');
      setIsLoadingProducts(true);
      getProducts().then(products => {
        console.log('✅ Loaded products:', products.length);
        setAllProducts(products);
        setIsLoadingProducts(false);
      }).catch(err => {
        console.error('❌ Failed to load products:', err);
        setIsLoadingProducts(false);
      });
    }
  }, []);

  const grandTotal = items.reduce((s, i) => s + (i.total || 0), 0);

  const addRow = () =>
    setItems(prev => [
      ...prev,
      { tempId: uid(), productName: '', quantity: 1, wholesalePrice: 0, total: 0 },
    ]);

  const updateRow = (tempId: string, updated: InvoiceItem) =>
    setItems(prev => prev.map(i => (i.tempId === tempId ? updated : i)));

  const removeRow = (tempId: string) =>
    setItems(prev => prev.filter(i => i.tempId !== tempId));

  const handleSave = async () => {
    const validItems = items.filter(i => i.productName.trim());
    if (validItems.length === 0) return alert('أضف سلعة واحدة على الأقل');

    // التحقق من توفر الكميات في المخزون
    for (const item of validItems) {
      if (item.productId) {
        const product = allProducts.find(p => p.id === item.productId);
        if (product && product.quantity !== undefined) {
          if (item.quantity > product.quantity) {
            alert(`الكمية المطلوبة للسلعة "${item.productName}" (${item.quantity}) أكبر من المخزون المتاح (${product.quantity})`);
            return;
          }
        }
      }
    }

    setIsSaving(true);

    // إضافة المبيعات الجديدة وتحديث المخزون
    for (const item of validItems) {
      await addSale({
        productId: item.productId,
        productName: item.productName,
        sellingPrice: item.total,
        date: new Date(date).toISOString(),
        customerId,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        quantity: item.quantity,
      });

      // إنقاص الكمية من المخزون
      if (item.productId) {
        const product = allProducts.find(p => p.id === item.productId);
        if (product && product.quantity !== undefined) {
          const newQty = Math.max(0, product.quantity - item.quantity);
          await updateProduct(item.productId, { 
            ...product, 
            quantity: newQty 
          });
        }
      }
    }

    setIsSaving(false);
    onSaved();
  };

  if (isLoadingProducts) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-blue-200 p-8 text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">جاري تحميل السلع...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-200 overflow-hidden">
      <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h3 className="font-bold text-lg">فاتورة جديدة</h3>
        <button onClick={onCancel} className="hover:bg-blue-700 p-1 rounded transition">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">تاريخ الفاتورة:</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 shrink-0">حالة الدفع:</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                type="button"
                onClick={() => setIsPaid(false)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition ${
                  !isPaid ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <XCircle size={15} /> غير مدفوعة
              </button>
              <button
                type="button"
                onClick={() => setIsPaid(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition ${
                  isPaid ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckCircle size={15} /> مدفوعة
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right px-2 py-2 text-sm font-semibold text-gray-600">اسم السلعة</th>
                <th className="text-center px-2 py-2 text-sm font-semibold text-gray-600">الكمية</th>
                <th className="text-center px-2 py-2 text-sm font-semibold text-gray-600">سعر الجملة</th>
                <th className="text-center px-2 py-2 text-sm font-semibold text-blue-600">المجموع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ItemRow
                  key={item.tempId}
                  item={item}
                  allProducts={allProducts}
                  onChange={updated => updateRow(item.tempId, updated)}
                  onRemove={() => removeRow(item.tempId)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addRow}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition"
          disabled={allProducts.length === 0}
        >
          <Plus size={16} />
          إضافة سلعة
        </button>

        <div className="flex justify-between items-center bg-gray-50 rounded-xl px-6 py-4 border border-gray-200">
          <span className="font-bold text-gray-800 text-lg">إجمالي الفاتورة:</span>
          <span className="text-2xl font-bold text-blue-600">{grandTotal.toLocaleString()} د.ج</span>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || allProducts.length === 0}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CustomerDetail Component ───────────────────────────────────────────

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<LoyalCustomer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!id) return;
      
      console.log('🔄 Loading customer data...');
      const customerData = await getLoyalCustomer(id);
      console.log('✅ Customer:', customerData);
      
      console.log('🔄 Loading sales...');
      const sales = await getSalesByCustomer(id);
      console.log('✅ Sales:', sales.length);
      
      console.log('🔄 Loading products...');
      const products = await getProducts();
      console.log('✅ Products:', products.length);

      setCustomer(customerData);
      setInvoices(buildInvoices(sales));
      setAllProducts(products);
    } catch (err) {
      console.error('❌ Error loading data:', err);
    }
    setIsLoading(false);
  };

  const buildInvoices = (sales: Sale[]): Invoice[] => {
    const map: Record<string, Sale[]> = {};
    for (const s of sales) {
      const key = toDateKey(s.date);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return Object.entries(map)
      .map(([dateKey, rawSales]) => ({
        dateKey,
        dateLabel: formatDateAr(dateKey),
        rawSales,
        items: rawSales.map(s => ({
          tempId: uid(),
          saleId: s.id,
          productId: s.productId,
          productName: s.productName,
          quantity: s.quantity || 1,
          wholesalePrice: s.sellingPrice / (s.quantity || 1),
          total: s.sellingPrice,
        })),
        grandTotal: rawSales.reduce((sum, s) => sum + s.sellingPrice, 0),
        isPaid: rawSales.every(s => s.paymentStatus === 'paid'),
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  };

  const togglePayment = async (invoice: Invoice) => {
    const newStatus = invoice.isPaid ? 'unpaid' : 'paid';
    for (const s of invoice.rawSales) {
      if (s.id) await updateSalePaymentStatus(s.id, newStatus);
    }
    await loadData();
  };

  const deleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm('هل تريد حذف هذه الفاتورة؟')) return;
    
    for (const s of invoice.rawSales) {
      if (s.id) {
        if (s.productId && s.quantity) {
          const product = allProducts.find(p => p.id === s.productId);
          if (product) {
            await updateProduct(s.productId, {
              ...product,
              quantity: (product.quantity || 0) + s.quantity
            });
          }
        }
        await deleteSale(s.id);
      }
    }
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3" dir="rtl">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">جاري تحميل بيانات الزبون...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16" dir="rtl">
        <Package className="mx-auto text-gray-300 mb-4" size={64} />
        <h2 className="text-xl font-bold text-gray-700 mb-2">الزبون غير موجود</h2>
        <Link to="/loyal-customers" className="text-blue-600 hover:underline">
          ← العودة لقائمة الزبائن
        </Link>
      </div>
    );
  }

  const totalUnpaid = invoices
    .filter(i => !i.isPaid)
    .reduce((s, i) => s + i.grandTotal, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <Link
        to="/loyal-customers"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm"
      >
        <ArrowRight size={18} />
        العودة لقائمة الزبائن
      </Link>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-start gap-5">
          <div className="bg-blue-100 p-4 rounded-full">
            <User className="text-blue-600" size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            {customer.phone && (
              <div className="flex items-center gap-2 text-gray-500 mt-1 text-sm">
                <Phone size={14} /> {customer.phone}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-gray-500 mt-1 text-sm">
                <MapPin size={14} /> {customer.address}
              </div>
            )}
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="text-center bg-gray-50 rounded-xl px-5 py-3">
              <p className="text-xs text-gray-500">عدد الفواتير</p>
              <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            </div>
            <div className="text-center bg-red-50 rounded-xl px-5 py-3">
              <p className="text-xs text-red-500">غير مدفوع</p>
              <p className="text-2xl font-bold text-red-600">{totalUnpaid.toLocaleString()} د.ج</p>
            </div>
          </div>
        </div>
      </div>

      {!showAddForm && !editingInvoice && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Plus size={20} />
          إضافة فاتورة جديدة
        </button>
      )}

      {showAddForm && (
        <InvoiceForm
          customerId={id!}
          allProducts={allProducts}
          onSaved={async () => { setShowAddForm(false); await loadData(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingInvoice && (
        <InvoiceForm
          customerId={id!}
          allProducts={allProducts}
          onSaved={async () => { setEditingInvoice(null); await loadData(); }}
          onCancel={() => setEditingInvoice(null)}
        />
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="text-blue-600" size={22} />
          سجل الفواتير
        </h2>

        {invoices.length === 0 ? (
          <div className="bg-white p-14 rounded-2xl border border-dashed border-gray-200 text-center">
            <CreditCard className="mx-auto text-gray-300 mb-4" size={56} />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد فواتير بعد</h3>
            <p className="text-gray-400 text-sm">اضغط "إضافة فاتورة جديدة" للبدء</p>
          </div>
        ) : (
          invoices.map((invoice, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                invoice.isPaid ? 'border-green-200' : 'border-orange-200'
              }`}
            >
              <div
                className={`px-5 py-4 flex flex-wrap gap-3 justify-between items-center ${
                  invoice.isPaid ? 'bg-green-50' : 'bg-orange-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-gray-500" />
                  <span className="font-bold text-gray-900">{invoice.dateLabel}</span>
                  <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                    {invoice.rawSales.length} سلعة
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setEditingInvoice(invoice); setShowAddForm(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 text-sm transition"
                  >
                    <Edit2 size={14} /> تعديل
                  </button>

                  <button
                    onClick={() => deleteInvoice(invoice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-600 text-sm transition"
                  >
                    <Trash2 size={14} /> حذف
                  </button>

                  <button
                    onClick={() => togglePayment(invoice)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-sm transition ${
                      invoice.isPaid
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {invoice.isPaid
                      ? <><CheckCircle size={15} /> تم الدفع</>
                      : <><XCircle size={15} /> لم يُدفع بعد</>
                    }
                  </button>
                </div>
              </div>

              <div className="p-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-500">
                      <th className="text-right pb-2">السلعة</th>
                      <th className="text-center pb-2">الكمية</th>
                      <th className="text-center pb-2">المبلغ</th>
                      <th className="text-left pb-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-800 font-medium">{item.productName}</td>
                        <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-2.5 text-center text-gray-900 font-bold">
                          {item.total.toLocaleString()} د.ج
                        </td>
                        <td className="py-2.5 text-left">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              invoice.isPaid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {invoice.isPaid
                              ? <><CheckCircle size={11} /> مدفوع</>
                              : <><XCircle size={11} /> غير مدفوع</>
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-700">إجمالي الفاتورة:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {invoice.grandTotal.toLocaleString()} د.ج
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
