import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLoyalCustomers,
  getSalesByCustomer,
  addSale,
  deleteSale,
  updateSalePaymentStatus,
  updateProduct,
  getProducts,
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
  tempId: string;       // مؤقت للواجهة فقط
  saleId?: string;      // id في قاعدة البيانات إذا حُفظ
  productId?: string;
  productName: string;
  quantity: number;
  wholesalePrice: number;
  total: number;        // قابل للتعديل اليدوي
}

interface Invoice {
  dateKey: string;      // YYYY-MM-DD للترتيب
  dateLabel: string;    // نص عربي للعرض
  items: InvoiceItem[];
  grandTotal: number;
  isPaid: boolean;
  rawSales: Sale[];
}

// ─── مساعدات ─────────────────────────────────────────────────────────────────

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

// ─── مكوّن صف سلعة في نموذج الفاتورة ─────────────────────────────────────────

interface ItemRowProps {
  item: InvoiceItem;
  allProducts: Product[];   // قائمة كاملة محملة مسبقاً
  onChange: (updated: InvoiceItem) => void;
  onRemove: () => void;
}

function ItemRow({ item, allProducts, onChange, onRemove }: ItemRowProps) {
  const [query, setQuery] = useState(item.productName);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSug, setShowSug] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNameChange = (val: string) => {
    setQuery(val);
    onChange({ ...item, productName: val, productId: undefined });
    if (val.trim().length >= 1) {
      const lower = val.toLowerCase();
      const filtered = allProducts
        .filter(p => p.name.toLowerCase().includes(lower))
        .slice(0, 6);
      setSuggestions(filtered);
      setShowSug(true);
    } else {
      setSuggestions([]);
      setShowSug(false);
    }
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

  const handleQty = (val: number) => {
    const q = Math.max(1, val);
    onChange({ ...item, quantity: q, total: item.wholesalePrice * q });
  };

  const handlePrice = (val: number) => {
    onChange({ ...item, wholesalePrice: val, total: val * item.quantity });
  };

  const handleTotal = (val: number) => {
    onChange({ ...item, total: val });
  };

  return (
    <tr className="border-b border-gray-100">
      {/* اسم السلعة */}
      <td className="p-2">
        <div ref={wrapRef} className="relative">
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 focus-within:border-blue-500">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              className="w-full py-1.5 text-sm outline-none bg-transparent"
              placeholder="اسم السلعة..."
              value={query}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => {
                const lower = query.toLowerCase();
                const pool = query.trim().length >= 1
                  ? allProducts.filter(p => p.name.toLowerCase().includes(lower))
                  : allProducts;
                setSuggestions(pool.slice(0, 6));
                setShowSug(true);
              }}
            />
          </div>
          {showSug && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {suggestions.map(p => (
                <li
                  key={p.id}
                  onMouseDown={() => pickProduct(p)}
                  className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-400 text-xs">
                    {p.wholesalePrice} د.ج | مخزون: {p.quantity ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </td>

      {/* الكمية */}
      <td className="p-2 w-20">
        <input
          type="number"
          min={1}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-blue-500"
          value={item.quantity}
          onChange={e => handleQty(Number(e.target.value))}
        />
      </td>

      {/* سعر الجملة */}
      <td className="p-2 w-28">
        <input
          type="number"
          min={0}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-blue-500"
          value={item.wholesalePrice}
          onChange={e => handlePrice(Number(e.target.value))}
        />
      </td>

      {/* المجموع */}
      <td className="p-2 w-28">
        <input
          type="number"
          min={0}
          className="w-full border border-blue-300 bg-blue-50 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none focus:border-blue-500"
          value={item.total}
          onChange={e => handleTotal(Number(e.target.value))}
        />
      </td>

      {/* حذف */}
      <td className="p-2 w-10">
        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 transition"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

// ─── نموذج إضافة / تعديل فاتورة ──────────────────────────────────────────────

interface InvoiceFormProps {
  customerId: string;
  existingInvoice?: Invoice; // إذا كانت موجودة → وضع التعديل
  onSaved: () => void;
  onCancel: () => void;
}

function InvoiceForm({ customerId, existingInvoice, onSaved, onCancel }: InvoiceFormProps) {
  const [date, setDate] = useState(
    existingInvoice ? existingInvoice.dateKey : todayISO()
  );
  const [items, setItems] = useState<InvoiceItem[]>(
    existingInvoice
      ? existingInvoice.items.map(i => ({ ...i, tempId: uid() }))
      : [{ tempId: uid(), productName: '', quantity: 1, wholesalePrice: 0, total: 0 }]
  );
  const [isPaid, setIsPaid] = useState<boolean>(existingInvoice?.isPaid ?? false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // جلب كل المنتجات مرة واحدة عند فتح النموذج
  useEffect(() => {
    getProducts().then(setAllProducts).catch(() => setAllProducts([]));
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

    setIsSaving(true);

    // إذا كانت فاتورة موجودة → احذف مبيعاتها القديمة أولاً
    if (existingInvoice) {
      for (const s of existingInvoice.rawSales) {
        if (s.id) await deleteSale(s.id);
      }
    }

    // أضف كل سلعة كـ Sale جديدة
    for (const item of validItems) {
      await addSale({
        productId: item.productId,
        productName: item.productName,
        sellingPrice: item.total,
        date: new Date(date).toISOString(),
        customerId,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
      });

      // إنقاص الكمية من المخزون إذا كان المنتج موجوداً
      if (item.productId) {
        try {
          const product = allProducts.find(p => p.id === item.productId);
          if (product && product.quantity !== undefined) {
            const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
            await updateProduct(item.productId, { ...product, quantity: newQty });
          }
        } catch (_) {}
      }
    }

    setIsSaving(false);
    onSaved();
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-200 overflow-hidden">
      {/* رأس النموذج */}
      <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h3 className="font-bold text-lg">
          {existingInvoice ? 'تعديل الفاتورة' : 'فاتورة جديدة'}
        </h3>
        <button onClick={onCancel} className="hover:bg-blue-700 p-1 rounded transition">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* التاريخ + حالة الدفع */}
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

          {/* حالة الدفع */}
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

        {/* جدول السلع */}
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

        {/* زر إضافة سلعة */}
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition"
        >
          <Plus size={16} />
          إضافة سلعة
        </button>

        {/* المجموع الكلي */}
        <div className="flex justify-between items-center bg-gray-50 rounded-xl px-6 py-4 border border-gray-200">
          <span className="font-bold text-gray-800 text-lg">إجمالي الفاتورة:</span>
          <span className="text-2xl font-bold text-blue-600">{grandTotal.toLocaleString()} د.ج</span>
        </div>

        {/* أزرار الحفظ */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
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

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<LoyalCustomer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // جلب الزبون
      const customers = await getLoyalCustomers();
      const found = customers.find(c => c.id === id) || null;
      setCustomer(found);

      if (id) {
        const sales = await getSalesByCustomer(id);
        setInvoices(buildInvoices(sales));
      }
    } catch (err) {
      console.error('خطأ في التحميل:', err);
    }
    setIsLoading(false);
  };

  // تجميع المبيعات إلى فواتير يومية
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
          quantity: 1,
          wholesalePrice: s.sellingPrice,
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
      if (s.id) await deleteSale(s.id);
    }
    await loadData();
  };

  // ── حالة التحميل ──
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

      {/* ── زر العودة ── */}
      <Link
        to="/loyal-customers"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm"
      >
        <ArrowRight size={18} />
        العودة لقائمة الزبائن
      </Link>

      {/* ── بطاقة معلومات الزبون ── */}
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

          {/* إحصاءات سريعة */}
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

      {/* ── زر إضافة فاتورة ── */}
      {!showAddForm && !editingInvoice && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Plus size={20} />
          إضافة فاتورة جديدة
        </button>
      )}

      {/* ── نموذج إضافة فاتورة ── */}
      {showAddForm && (
        <InvoiceForm
          customerId={id!}
          onSaved={async () => { setShowAddForm(false); await loadData(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* ── نموذج تعديل فاتورة ── */}
      {editingInvoice && (
        <InvoiceForm
          customerId={id!}
          existingInvoice={editingInvoice}
          onSaved={async () => { setEditingInvoice(null); await loadData(); }}
          onCancel={() => setEditingInvoice(null)}
        />
      )}

      {/* ── قائمة الفواتير ── */}
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
              {/* رأس الفاتورة */}
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
                  {/* تعديل */}
                  <button
                    onClick={() => { setEditingInvoice(invoice); setShowAddForm(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 text-sm transition"
                  >
                    <Edit2 size={14} /> تعديل
                  </button>

                  {/* حذف */}
                  <button
                    onClick={() => deleteInvoice(invoice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-600 text-sm transition"
                  >
                    <Trash2 size={14} /> حذف
                  </button>

                  {/* حالة الدفع */}
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

              {/* محتوى الفاتورة */}
              <div className="p-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-500">
                      <th className="text-right pb-2">السلعة</th>
                      <th className="text-center pb-2">المبلغ</th>
                      <th className="text-left pb-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.rawSales.map(sale => (
                      <tr key={sale.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-800 font-medium">{sale.productName}</td>
                        <td className="py-2.5 text-center text-gray-900 font-bold">
                          {sale.sellingPrice.toLocaleString()} د.ج
                        </td>
                        <td className="py-2.5 text-left">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              sale.paymentStatus === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {sale.paymentStatus === 'paid'
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
