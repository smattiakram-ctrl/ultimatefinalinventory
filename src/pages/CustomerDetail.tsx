import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLoyalCustomers, getSalesByCustomer, updateSalePaymentStatus, Sale, LoyalCustomer } from '../db';
import { ArrowRight, Calendar, CheckCircle, XCircle, CreditCard, User, Phone, MapPin } from 'lucide-react';

interface Invoice {
  date: string;
  sales: Sale[];
  total: number;
  isPaid: boolean;
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<LoyalCustomer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    setIsLoading(true);

    // جلب بيانات الزبون
    const customers = await getLoyalCustomers();
    const foundCustomer = customers.find(c => c.id === id);
    setCustomer(foundCustomer || null);

    if (id) {
      // جلب مبيعات الزبون
      const sales = await getSalesByCustomer(id);

      // تجميع المبيعات حسب التاريخ (يومياً)
      const groupedByDate = sales.reduce((acc, sale) => {
        const date = new Date(sale.date).toLocaleDateString('ar-DZ', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(sale);
        return acc;
      }, {} as Record<string, Sale[]>);

      // تحويل إلى مصفوفة فواتير
      const invoicesList: Invoice[] = Object.entries(groupedByDate).map(([date, sales]) => ({
        date,
        sales,
        total: sales.reduce((sum, s) => sum + (s.sellingPrice || 0), 0),
        isPaid: sales.every(s => s.paymentStatus === 'paid')
      }));

      // ترتيب من الأحدث للأقدم
      invoicesList.sort((a, b) => new Date(b.sales[0].date).getTime() - new Date(a.sales[0].date).getTime());

      setInvoices(invoicesList);
    }

    setIsLoading(false);
  };

  const togglePaymentStatus = async (invoice: Invoice) => {
    const newStatus = invoice.isPaid ? 'unpaid' : 'paid';

    // تحديث جميع مبيعات الفاتورة
    for (const sale of invoice.sales) {
      if (sale.id) {
        await updateSalePaymentStatus(sale.id, newStatus);
      }
    }

    await loadCustomerData();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64" dir="rtl">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12" dir="rtl">
        <h2 className="text-xl font-bold text-gray-900 mb-2">الزبون غير موجود</h2>
        <Link to="/loyal-customers" className="text-blue-600 hover:underline">
          العودة لقائمة الزبائن
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/loyal-customers"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowRight size={20} />
          <span>العودة للقائمة</span>
        </Link>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <User className="text-blue-600" size={32} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{customer.name}</h1>

            {customer.phone && (
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Phone size={16} />
                <span>{customer.phone}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={16} />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-500">عدد الفواتير</p>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="text-blue-600" size={24} />
          سجل المشتريات
        </h2>

        {invoices.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <CreditCard className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مشتريات</h3>
            <p className="text-gray-500">هذا الزبون لم يقم بأي عملية شراء بعد</p>
          </div>
        ) : (
          invoices.map((invoice, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${
                invoice.isPaid ? 'border-green-200' : 'border-red-200'
              }`}
            >
              {/* Invoice Header */}
              <div className={`p-4 flex justify-between items-center ${
                invoice.isPaid ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-gray-600" />
                  <span className="font-bold text-gray-900">{invoice.date}</span>
                  <span className="text-sm text-gray-500">
                    ({invoice.sales.length} {invoice.sales.length === 1 ? 'منتج' : 'منتجات'})
                  </span>
                </div>

                <button
                  onClick={() => togglePaymentStatus(invoice)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    invoice.isPaid
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {invoice.isPaid ? (
                    <>
                      <CheckCircle size={18} />
                      <span>تم الدفع</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={18} />
                      <span>لم يتم الدفع</span>
                    </>
                  )}
                </button>
              </div>

              {/* Invoice Items */}
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-2 text-sm font-medium text-gray-600">المنتج</th>
                      <th className="text-center py-2 text-sm font-medium text-gray-600">السعر</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-600">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-gray-900">{sale.productName}</td>
                        <td className="py-3 text-center text-gray-900 font-medium">
                          {sale.sellingPrice} د.ج
                        </td>
                        <td className="py-3 text-left">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            sale.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {sale.paymentStatus === 'paid' ? (
                              <><CheckCircle size={12} /> تم الدفع</>
                            ) : (
                              <><XCircle size={12} /> لم يتم الدفع</>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Invoice Total */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-900">إجمالي الفاتورة:</span>
                  <span className="text-2xl font-bold text-blue-600">{invoice.total} د.ج</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
