/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Categories } from './pages/Categories';
import { CategoryProducts } from './pages/CategoryProducts';
import { Sell } from './pages/Sell';
import { Sales } from './pages/Sales';
import { AddProduct } from './pages/AddProduct';
import { LowStock } from './pages/LowStock';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:id" element={<CategoryProducts />} />
          <Route path="sell" element={<Sell />} />
          <Route path="sales" element={<Sales />} />
          <Route path="add-product" element={<AddProduct />} />
<Route path="low-stock" element={<LowStock >} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
