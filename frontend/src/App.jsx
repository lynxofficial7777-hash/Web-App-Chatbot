import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StorePage  from "./pages/StorePage";
import AdminPage  from "./pages/AdminPage";
import CartPage   from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";

export default function App() {
  // ── Lifted cart state ──────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<StorePage  cart={cart} setCart={setCart} />} />
        <Route path="/cart"   element={<CartPage   cart={cart} setCart={setCart} />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/admin"  element={<AdminPage  />} />
      </Routes>
    </BrowserRouter>
  );
}