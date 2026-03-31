import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../db';
import { Search, Camera, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function Sell() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [successMessage, setSuccessMessage] = useState('');

  const searchResults = useLiveQuery(
    () => {
      if (!searchQuery) return [];
      return db.products
        .filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.barcode && p.barcode.includes(searchQuery))
        )
        .limit(5)
        .toArray();
    },
    [searchQuery]
  );

  // Auto-select if exact barcode match
  useEffect(() => {
    if (searchResults && searchResults.length === 1 && searchResults[0].barcode === searchQuery) {
      handleSelectProduct(searchResults[0]);
      setSearchQuery('');
    }
  }, [searchResults, searchQuery]);

  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      setScanner(newScanner);
      newScanner.render(
        (decodedText) => {
          setSearchQuery(decodedText);
          newScanner.clear();
          setIsScanning(false);
        },
        (error) => {
          console.warn(error);
        }
      );
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
    }
    setIsScanning(false);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSellingPrice(product.retailPrice || '');
    setSearchQuery('');
  };

  const handleSell = async () => {
    if (!selectedProduct || sellingPrice === '') return;

    // Record sale
    await db.sales.add({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sellingPrice: Number(sellingPrice),
      date: new Date()
    });

    // Update quantity
    if (selectedProduct.quantity && selectedProduct.quantity > 0) {
      await db.products.update(selectedProduct.id!, {
        quantity: selectedProduct.quantity - 1
      });
    }

    setSuccessMessage(`تم بيع "${selectedProduct.name}" بنجاح!`);
    setSelectedProduct(null);
    setSellingPrice('');
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">بيع سلعة</h1>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <CheckCircle2 size={24} />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">ابحث بالاسم أو الباركود</label>
        <div className="flex gap-2 relative">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              autoFocus
              className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-lg"
              placeholder="ابحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={startScanner}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Camera size={24} />
          </button>
        </div>

        {isScanning && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div id="reader" className="w-full max-w-sm mx-auto"></div>
            <button 
              onClick={stopScanner}
              className="w-full bg-red-100 text-red-600 py-3 font-medium hover:bg-red-200 transition"
            >
              إلغاء المسح
            </button>
          </div>
        )}

        {searchQuery && searchResults && searchResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow-lg absolute z-10 bg-white w-full max-w-3xl left-0 right-0 mx-auto">
            <ul className="divide-y divide-gray-100">
              {searchResults.map((product) => (
                <li 
                  key={product.id} 
                  onClick={() => handleSelectProduct(product)}
                  className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition"
                >
                  <div>
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{product.barcode || 'بدون باركود'}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-green-600">{product.retailPrice ? `${product.retailPrice} د.ج` : '-'}</p>
                    <p className="text-xs text-gray-500">الكمية: {product.quantity || 0}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 ring-1 ring-blue-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ShoppingCart size={32} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="block text-gray-400">الكمية المتوفرة</span>
                  <span className="font-medium text-lg text-gray-900">{selectedProduct.quantity || 0}</span>
                </div>
                <div>
                  <span className="block text-gray-400">سعر الجملة</span>
                  <span className="font-medium text-lg text-gray-900">{selectedProduct.wholesalePrice ? `${selectedProduct.wholesalePrice} د.ج` : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">سعر البيع (د.ج)</label>
            <div className="flex gap-4">
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 p-4 border-2 border-blue-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-2xl font-bold text-center"
                placeholder="0.00"
              />
              <button 
                onClick={handleSell}
                disabled={sellingPrice === ''}
                className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-xl font-bold flex items-center gap-2"
              >
                <CheckCircle2 size={28} />
                تأكيد البيع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
