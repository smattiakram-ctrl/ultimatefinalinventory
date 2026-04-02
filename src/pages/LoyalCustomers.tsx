import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getLoyalCustomers, addLoyalCustomer, deleteLoyalCustomer, LoyalCustomer } from '../db';
import { Users, Plus, Trash2, Phone, MapPin, User, ArrowLeft } from 'lucide-react';

export function LoyalCustomers() {
  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await getLoyalCustomers();
    setCustomers(data);
  };

  const handleAddCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;

    setIsLoading(true);
    await addLoyalCustomer(newCustomer);
    setNewCustomer({ name: '', phone: '', address: '' });
    setShowAddForm(false);
    await loadCustomers();
    setIsLoading(false);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الزبون؟')) {
      await deleteLoyalCustomer(id);
      await loadCustomers();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            الزبائن الدائمين
          </h1>
          <p className="text-gray-500 mt-1">إدارة قائمة الزبائن الدائمين ومتابعة مشترياتهم</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          <span>إضافة زبون</span>
        </button>
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">إضافة زبون دائم جديد</h2>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="اسم الزبون"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="رقم الهاتف"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="العنوان"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {isLoading ? 'جاري الإضافة...' : 'حفظ الزبون'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد زبائن دائمين</h3>
            <p className="text-gray-500">ابدأ بإضافة زبائنك الدائمين لمتابعة مشترياتهم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id!)}
                    className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-2">{customer.name}</h3>

                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <Phone size={14} />
                    <span>{customer.phone}</span>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                    <MapPin size={14} />
                    <span>{customer.address}</span>
                  </div>
                )}

                <Link
                  to={`/loyal-customers/${customer.id}`}
                  className="flex items-center justify-center gap-2 w-full mt-4 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition"
                >
                  <span>عرض المشتريات</span>
                  <ArrowLeft size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
