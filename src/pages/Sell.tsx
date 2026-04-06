import { useState, useEffect } from 'react';
import { Product, searchProducts, updateProduct, addSale } from '../db';
import { Search, Camera, ShoppingCart, CheckCircle2, Plus, Minus } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function Sell() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const results = await searchProducts(searchQuery);
      setSearchResults(results);
      if (results.length === 1 && results[0].barcode === searchQuery) {
        handleSelectProduct(results[0]);
        setSearchQuery('');
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      setScanner(newScanner);
      newScanner.render(
        (decodedText) => { setSearchQuery(decodedText); newScanner.clear(); setIsScanning(false); },
        (error) => { console.warn(error); }
      );
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) scanner.clear();
    setIsScanning(false);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSellingPrice(product.retailPrice || '');
    setQuantity(1);
    setError('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!selectedProduct) return;
    
    const maxQuantity = selectedProduct.quantity || 0;
    
    if (newQuantity < 1) {
      setQuantity(1);
    } else if (newQuantity > maxQuantity) {
      setError(`الكمية المتاحة: ${maxQuantity} فقط`);
      setQuantity(maxQuantity);
    } else {
      setError('');
      setQuantity(newQuantity);
    }
  };

  const incrementQuantity = () => handleQuantityChange(quantity + 1);
  const decrementQuantity = () => handleQuantityChange(quantity - 1);

  const handleSell = async () => {
    if (!selectedProduct || sellingPrice === '') return;

    const totalPrice = Number(sellingPrice) * quantity;

    await addSale({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sellingPrice: totalPrice,
      date: new Date().toISOString(),
      quantity: quantity, // ← إرسال الكمية مع عملية البيع
    });

    if (selectedProduct.quantity && selectedProduct.quantity >= quantity) {
      await updateProduct(selectedProduct.id!, { quantity: selectedProduct.quantity - quantity });
    }

    setSuccessMessage(`تم بيع ${quantity} × "${selectedProduct.name}" بمبلغ ${totalPrice} د.ج!`);
    setSelectedProduct(null);
    setSellingPrice('');
    setQuantity(1);
    setError('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // حساب الإجمالي
  const totalPrice = sellingPrice !== '' ? Number(sellingPrice) * quantity : 0;

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
            <input type="text" autoFocus
              className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-lg"
              placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={startScanner} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
            <Camera size={24} />
          </button>
        </div>

        {isScanning && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div id="reader" className="w-full max-w-sm mx-auto"></div>
            <button onClick={stopScanner} className="w-full bg-red-100 text-red-600 py-3 font-medium hover:bg-red-200 transition">إلغاء المسح</button>
          </div>
        )}

        {searchQuery && searchResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow-lg bg-white">
            <ul className="divide-y divide-gray-100">
              {searchResults.map((product) => (
                <li key={product.id} onClick={() => handleSelectProduct(product)}
                  className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition">
                  <div>
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{product.barcode || 'بدون باركود'}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-green-600">{product.retailPrice ? `${product.retailPrice} د.ج` : '-'}</p>
                    <p className="text-xs text-gray-500">المخزون: {product.quantity || 0}</p>
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
                <div className="w-full h-full flex items-center justify-center text-gray-400"><ShoppingCart size={32} /></div>
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

          {/* التحكم في الكمية - جديد */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">الكمية المباعة</label>
            <div className="flex items-center gap-3">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Minus size={20} className="text-gray-700" />
              </button>
              
              <input
                type="number"
                min="1"
                max={selectedProduct.quantity || 0}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-24 text-center py-3 border-2 border-blue-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-xl font-bold"
              />
              
              <button
                onClick={incrementQuantity}
                disabled={quantity >= (selectedProduct.quantity || 0)}
                className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Plus size={20} className="text-gray-700" />
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">سعر البيع للوحدة (د.ج)</label>
            <div className="flex gap-4">
              <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 p-4 border-2 border-blue-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-2xl font-bold text-center" placeholder="0.00" />
            </div>
            
            {/* عرض الإجمالي - جديد */}
            <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-700 mb-1">الإجمالي</p>
              <p className="text-3xl font-bold text-green-600">{totalPrice} د.ج</p>
              <p className="text-sm text-green-600 mt-1">{quantity} × {sellingPrice || 0} د.ج</p>
            </div>

            <button onClick={handleSell} disabled={sellingPrice === '' || quantity < 1 || quantity > (selectedProduct.quantity || 0)}
              className="w-full mt-4 bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-xl font-bold flex items-center justify-center gap-2">
              <CheckCircle2 size={28} /> تأكيد البيع
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
