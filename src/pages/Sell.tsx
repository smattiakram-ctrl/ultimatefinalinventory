import { useState, useEffect } from 'react';
import { Product, searchProducts, updateProduct, addSale } from '../db';
import { Search, Camera, ShoppingCart, CheckCircle2, Plus, Minus, Trash2, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface CartItem {
  product: Product;
  quantity: number;
  sellingPrice: number;
}

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
  
  // ✅ سلة المشتريات الجديدة
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

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
    
    const maxQuantity = selectedProduct.quantity ?? 0;
    
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

  // ✅ إضافة للسلة
  const addToCart = () => {
    if (!selectedProduct || sellingPrice === '') return;

    const currentQuantity = selectedProduct.quantity ?? 0;
    if (currentQuantity < quantity) {
      setError(`الكمية المتاحة: ${currentQuantity} فقط`);
      return;
    }

    // ✅ التحقق إذا المنتج موجود في السلة
    const existingItemIndex = cart.findIndex(item => item.product.id === selectedProduct.id);
    
    if (existingItemIndex >= 0) {
      // ✅ تحديث الكمية إذا موجود
      const updatedCart = [...cart];
      const newQty = updatedCart[existingItemIndex].quantity + quantity;
      
      if (newQty > currentQuantity) {
        setError(`الكمية الإجمالية (${newQty}) تتجاوز المخزون (${currentQuantity})`);
        return;
      }
      
      updatedCart[existingItemIndex].quantity = newQty;
      setCart(updatedCart);
    } else {
      // ✅ إضافة منتج جديد للسلة
      setCart([...cart, {
        product: selectedProduct,
        quantity: quantity,
        sellingPrice: Number(sellingPrice)
      }]);
    }

    // ✅ إعادة تعيين النموذج
    setSelectedProduct(null);
    setSellingPrice('');
    setQuantity(1);
    setError('');
    setShowCart(true);
  };

  // ✅ إزالة من السلة
  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
    if (updatedCart.length === 0) setShowCart(false);
  };

  // ✅ تعديل كمية في السلة
  const updateCartQuantity = (index: number, newQty: number) => {
    const item = cart[index];
    const maxQty = item.product.quantity ?? 0;
    
    if (newQty < 1) return;
    if (newQty > maxQty) {
      setError(`الكمية المتاحة: ${maxQty} فقط`);
      return;
    }
    
    const updatedCart = [...cart];
    updatedCart[index].quantity = newQty;
    setCart(updatedCart);
    setError('');
  };

  // ✅ حساب الإجمالي الكلي
  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ✅ إتمام البيع للكل
  const handleSellAll = async () => {
    if (cart.length === 0) return;

    try {
      // ✅ بيع كل منتج في السلة
      for (const item of cart) {
        const totalPrice = item.sellingPrice * item.quantity;
        const currentQty = item.product.quantity ?? 0;
        const newQty = currentQty - item.quantity;

        // تحديث المخزون
        await updateProduct(item.product.id!, { quantity: newQty });

        // تسجيل البيع
        await addSale({
          productId: item.product.id,
          productName: item.product.name,
          sellingPrice: totalPrice,
          date: new Date().toISOString(),
          quantity: item.quantity,
        });
      }

      setSuccessMessage(`✅ تم بيع ${cart.length} منتج (${cartItemsCount} قطعة) بمبلغ ${cartTotal.toLocaleString('ar-DZ')} د.ج!`);
      setCart([]);
      setShowCart(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError('❌ حدث خطأ أثناء عملية البيع');
      console.error('خطأ في البيع:', err);
    }
  };

  // ✅ إلغاء السلة
  const clearCart = () => {
    if (window.confirm('هل أنت متأكد من إفراغ السلة؟')) {
      setCart([]);
      setShowCart(false);
    }
  };

  const totalPrice = sellingPrice !== '' ? Number(sellingPrice) * quantity : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">بيع سريع</h1>
        
        {/* ✅ زر السلة */}
        <button 
          onClick={() => setShowCart(!showCart)}
          className="relative bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <ShoppingCart size={20} />
          <span>السلة</span>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {cartItemsCount}
            </span>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <CheckCircle2 size={24} />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ✅ قسم البحث والإضافة */}
        <div className="space-y-6">
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
                        <p className="text-xs text-gray-500">المخزون: {product.quantity ?? 0}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ✅ نموذج إضافة منتج */}
          {selectedProduct && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 ring-1 ring-blue-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><ShoppingCart size={24} /></div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{selectedProduct.name}</h2>
                  <p className="text-sm text-gray-500">المخزون: {selectedProduct.quantity ?? 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* الكمية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الكمية</label>
                  <div className="flex items-center gap-3">
                    <button onClick={decrementQuantity} disabled={quantity <= 1}
                      className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 disabled:opacity-50">
                      <Minus size={18} />
                    </button>
                    <input type="number" min="1" max={selectedProduct.quantity ?? 0} value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      className="w-20 text-center py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-bold" />
                    <button onClick={incrementQuantity} disabled={quantity >= (selectedProduct.quantity ?? 0)}
                      className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 disabled:opacity-50">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* سعر البيع */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">سعر البيع للوحدة (د.ج)</label>
                  <input type="number" value={sellingPrice} 
                    onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-xl font-bold text-center" 
                    placeholder="0.00" />
                </div>

                {/* الإجمالي */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-green-700">الإجمالي</p>
                  <p className="text-2xl font-bold text-green-600">{totalPrice.toLocaleString('ar-DZ')} د.ج</p>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                {/* زر الإضافة للسلة */}
                <button onClick={addToCart} disabled={sellingPrice === '' || quantity < 1}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-bold flex items-center justify-center gap-2">
                  <Plus size={20} /> إضافة للسلة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ✅ قسم السلة */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${showCart ? 'block' : 'hidden lg:block'}`}>
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={20} />
              سلة المبيعات
              {cart.length > 0 && <span className="text-sm font-normal text-gray-500">({cart.length} منتج)</span>}
            </h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                <Trash2 size={16} /> إفراغ
              </button>
            )}
          </div>

          <div className="p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
                <p>السلة فارغة</p>
                <p className="text-sm mt-2">ابحث عن منتج وأضفه للسلة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ✅ قائمة المنتجات في السلة */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.name} className="w-12 h-12 object-cover rounded-lg" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                              <ShoppingCart size={20} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-500">{item.sellingPrice.toLocaleString('ar-DZ')} د.ج / وحدة</p>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(index)} className="text-red-400 hover:text-red-600 p-1">
                          <X size={18} />
                        </button>
                      </div>
                      
                      {/* تعديل الكمية في السلة */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100">
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center font-bold">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100">
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="font-bold text-green-600">
                          {(item.sellingPrice * item.quantity).toLocaleString('ar-DZ')} د.ج
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ✅ ملخص السلة */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">عدد المنتجات:</span>
                    <span className="font-medium">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">إجمالي القطع:</span>
                    <span className="font-medium">{cartItemsCount}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>المجموع الكلي:</span>
                    <span className="text-green-600">{cartTotal.toLocaleString('ar-DZ')} د.ج</span>
                  </div>
                </div>

                {/* ✅ زر إتمام البيع */}
                <button onClick={handleSellAll}
                  className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-bold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 size={24} /> إتمام البيع
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
