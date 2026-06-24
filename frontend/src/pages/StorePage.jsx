import { useState } from "react";
import ChatWidget from "../components/ChatWidget";

const PRODUCTS = [
  { id: 1, name: "Nike Air Max", price: 4500, image: "NA", category: "Footwear" },
  { id: 2, name: "Samsung Earbuds", price: 3200, image: "SE", category: "Electronics" },
  { id: 3, name: "Laptop Stand", price: 1500, image: "LS", category: "Accessories" },
  { id: 4, name: "Wireless Mouse", price: 999, image: "WM", category: "Electronics" },
  { id: 5, name: "Bluetooth Speaker", price: 2800, image: "BS", category: "Electronics" },
  { id: 6, name: "Yoga Mat", price: 800, image: "YM", category: "Fitness" },
  { id: 7, name: "Coffee Maker", price: 5500, image: "CM", category: "Kitchen" },
  { id: 8, name: "Running Shoes", price: 3800, image: "RS", category: "Footwear" },
];

export default function StorePage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "Inter, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ background: "#1a1a2e", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "white", fontSize: "22px", fontWeight: 700 }}>ShopEase</div>
        <div style={{ display: "flex", gap: "24px", color: "#aaa", fontSize: "14px" }}>
          <span style={{ color: "white", cursor: "pointer" }}>Home</span>
          <span style={{ cursor: "pointer" }}>Products</span>
          <span style={{ cursor: "pointer" }}>Orders</span>
          <span style={{ cursor: "pointer" }}>Contact</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "white", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </span>
          <span style={{ color: "white", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #4f7fff)", padding: "60px 40px", textAlign: "center" }}>
        <h1 style={{ color: "white", fontSize: "42px", fontWeight: 800, marginBottom: "12px" }}>
          Shop Smarter, Shop Easier
        </h1>
        <p style={{ color: "#ccc", fontSize: "16px", marginBottom: "24px" }}>
          Premium products with hassle-free returns. Need help? Chat with our AI support agent!
        </p>
        <button style={{ background: "#4f7fff", color: "white", border: "none", padding: "12px 32px", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: 600 }}>
          Shop Now
        </button>
      </div>

      {/* Products */}
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px", color: "#1a1a2e" }}>
          Featured Products
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {PRODUCTS.map((p) => (
            <div key={p.id} style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ width: "80px", height: "80px", background: "#e8edf8", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "18px", fontWeight: 700, color: "#2563eb", letterSpacing: "1px" }}>{p.image}</div>
              <div style={{ fontSize: "11px", color: "#4f7fff", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>{p.category}</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e", marginBottom: "8px" }}>{p.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a2e" }}>₹{p.price.toLocaleString()}</span>
                <button style={{ background: "#4f7fff", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#1a1a2e", color: "#aaa", textAlign: "center", padding: "24px", fontSize: "13px" }}>
        © 2026 ShopEase · All rights reserved · <span style={{ color: "#4f7fff", cursor: "pointer" }} onClick={() => window.location.href="/admin"}>Admin</span>
      </footer>

      {/* Chat Widget */}
      <ChatWidget open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  );
}