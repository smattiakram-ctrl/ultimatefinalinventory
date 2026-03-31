import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, PackagePlus, Tags, History, RefreshCcw, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'الصفحة الرئيسية', icon: Home },
    { path: '/sell', label: 'خانة البيع', icon: ShoppingCart },
    { path: '/categories', label: 'إضافة صنف', icon: Tags },
    { path: '/add-product', label: 'إضافة سلعة', icon: PackagePlus },
    { path: '/sales', label: 'سجل المبيعات', icon: History },
  ];

  const handleResetProfits = async () => {
    if (window.confirm('هل أنت متأكد من تصفير الأرباح؟ سيتم حذف جميع سجلات المبيعات نهائياً!')) {
      const { db } = await import('../db');
      await db.sales.clear();
      alert('تم تصفير الأرباح بنجاح');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col" dir="rtl">
      {/* Header for all screens */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center z-30 relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-xl font-bold text-blue-600">متجري</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed md:relative top-0 right-0 h-full bg-white shadow-lg z-30 transition-all duration-300 ease-in-out flex flex-col",
            isSidebarOpen ? "w-64 translate-x-0" : "w-64 translate-x-full md:w-0 md:translate-x-0 overflow-hidden"
          )}
        >
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto w-64">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    // Only close on mobile when clicking a link
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-600 font-medium" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
                handleResetProfits();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 font-medium mt-4"
            >
              <RefreshCcw size={20} />
              <span>تصفير الأرباح</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
