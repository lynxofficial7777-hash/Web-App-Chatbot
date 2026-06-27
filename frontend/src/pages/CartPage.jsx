import { useState } from "react";

// ── Delivery threshold ─────────────────────────────────────────────────────────
const FREE_DELIVERY_THRESHOLD = 500;
const DELIVERY_FEE = 49;

export default function CartPage({ cart, setCart }) {
  const [hoveredRemove, setHoveredRemove] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total    = subtotal + delivery;

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div
        style={{
          minHeight:  "100vh",
          background: "#f3f4f6",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          display:    "flex",
          flexDirection: "column",
        }}
      >
        <Navbar cartCount={0} />
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "20px",
            padding:        "60px 20px",
          }}
        >
          <svg
            width="72" height="72" viewBox="0 0 24 24"
            fill="none" stroke="#cbd5e1" strokeWidth="1.2"
          >
            <circle cx="9"  cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
              Your cart is empty
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              Looks like you haven't added anything yet.
            </p>
          </div>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              background:   "linear-gradient(135deg, #2563eb, #6366f1)",
              color:        "white",
              border:       "none",
              padding:      "12px 32px",
              borderRadius: "10px",
              fontSize:     "14px",
              fontWeight:   700,
              cursor:       "pointer",
              letterSpacing:"0.3px",
              boxShadow:    "0 4px 16px rgba(79,70,229,0.35)",
              marginTop:    "4px",
            }}
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  // ── Filled cart ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight:  "100vh",
        background: "#f3f4f6",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <Navbar cartCount={cart.reduce((s, i) => s + i.qty, 0)} />

      <div
        style={{
          maxWidth: "1100px",
          margin:   "0 auto",
          padding:  "36px 28px",
          display:  "grid",
          gridTemplateColumns: "1fr 340px",
          gap:      "28px",
          alignItems: "start",
        }}
      >
        {/* ── Items column ──────────────────────────────────────────────────── */}
        <div>
          <h1
            style={{
              fontSize:      "22px",
              fontWeight:    800,
              color:         "#0f172a",
              marginBottom:  "20px",
              letterSpacing: "-0.4px",
            }}
          >
            Shopping Cart
            <span
              style={{
                marginLeft:   "10px",
                fontSize:     "14px",
                fontWeight:   500,
                color:        "#6b7280",
                letterSpacing:"0",
              }}
            >
              {cart.reduce((s, i) => s + i.qty, 0)} item{cart.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}
            </span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  background:   "white",
                  borderRadius: "14px",
                  padding:      "18px 20px 18px 18px",
                  boxShadow:    "0 2px 10px rgba(0,0,0,0.06)",
                  display:      "flex",
                  gap:          "16px",
                  alignItems:   "center",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width:        "88px",
                    height:       "88px",
                    borderRadius: "10px",
                    overflow:     "hidden",
                    flexShrink:   0,
                    background:   "#f1f5f9",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize:     "11px",
                      color:        "#6366f1",
                      fontWeight:   700,
                      textTransform:"uppercase",
                      letterSpacing:"0.7px",
                      marginBottom: "3px",
                    }}
                  >
                    {item.category}
                  </div>
                  <div
                    style={{
                      fontSize:     "15px",
                      fontWeight:   700,
                      color:        "#0f172a",
                      marginBottom: "10px",
                      whiteSpace:   "nowrap",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {/* Qty controls */}
                    <div
                      style={{
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "0",
                        border:       "1.5px solid #e2e8f0",
                        borderRadius: "8px",
                        overflow:     "hidden",
                      }}
                    >
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        style={{
                          width:      "32px",
                          height:     "32px",
                          background: "#f8fafc",
                          border:     "none",
                          cursor:     "pointer",
                          fontSize:   "18px",
                          fontWeight: 500,
                          color:      "#374151",
                          display:    "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        -
                      </button>
                      <span
                        style={{
                          width:      "36px",
                          textAlign:  "center",
                          fontSize:   "14px",
                          fontWeight: 700,
                          color:      "#0f172a",
                          background: "white",
                          lineHeight: "32px",
                          display:    "block",
                        }}
                      >
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        style={{
                          width:      "32px",
                          height:     "32px",
                          background: "#f8fafc",
                          border:     "none",
                          cursor:     "pointer",
                          fontSize:   "18px",
                          fontWeight: 500,
                          color:      "#374151",
                          display:    "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      onMouseEnter={() => setHoveredRemove(item.id)}
                      onMouseLeave={() => setHoveredRemove(null)}
                      style={{
                        background: hoveredRemove === item.id ? "#fee2e2" : "transparent",
                        border:     "none",
                        cursor:     "pointer",
                        color:      hoveredRemove === item.id ? "#ef4444" : "#9ca3af",
                        fontSize:   "12px",
                        fontWeight: 600,
                        padding:    "6px 10px",
                        borderRadius:"6px",
                        transition: "all 0.18s ease",
                        display:    "flex",
                        alignItems: "center",
                        gap:        "4px",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5"
                      >
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>

                {/* Line price */}
                <div
                  style={{
                    flexShrink: 0,
                    textAlign:  "right",
                  }}
                >
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                    ₹{(item.price * item.qty).toLocaleString("en-IN")}
                  </div>
                  {item.qty > 1 && (
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                      ₹{item.price.toLocaleString("en-IN")} each
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Continue shopping */}
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              marginTop:    "20px",
              background:   "transparent",
              border:       "1.5px solid #d1d5db",
              color:        "#4b5563",
              padding:      "9px 20px",
              borderRadius: "8px",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              gap:          "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Continue Shopping
          </button>
        </div>

        {/* ── Summary panel ──────────────────────────────────────────────────── */}
        <div
          style={{
            background:   "white",
            borderRadius: "16px",
            padding:      "26px 24px",
            boxShadow:    "0 2px 16px rgba(0,0,0,0.07)",
            position:     "sticky",
            top:          "80px",
          }}
        >
          <h2
            style={{
              fontSize:     "16px",
              fontWeight:   800,
              color:        "#0f172a",
              margin:       "0 0 20px",
              letterSpacing:"-0.3px",
            }}
          >
            Order Summary
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "13px", marginBottom: "20px" }}>
            <SummaryRow label="Subtotal" value={`₹${subtotal.toLocaleString("en-IN")}`} />
            <SummaryRow
              label="Delivery"
              value={delivery === 0 ? "Free" : `₹${delivery}`}
              valueColor={delivery === 0 ? "#16a34a" : "#0f172a"}
            />
            {delivery > 0 && (
              <p style={{ fontSize: "11px", color: "#9ca3af", margin: "-6px 0 0", lineHeight: 1.5 }}>
                Add ₹{(FREE_DELIVERY_THRESHOLD - subtotal).toLocaleString("en-IN")} more for free delivery
              </p>
            )}
          </div>

          <div
            style={{
              borderTop:   "1.5px solid #f1f5f9",
              paddingTop:  "16px",
              display:     "flex",
              justifyContent: "space-between",
              alignItems:  "center",
              marginBottom: "22px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Total</span>
            <span style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>

          <button
            onClick={() => alert("Checkout coming soon.")}
            style={{
              width:        "100%",
              background:   "linear-gradient(135deg, #2563eb, #6366f1)",
              color:        "white",
              border:       "none",
              padding:      "14px",
              borderRadius: "11px",
              fontSize:     "15px",
              fontWeight:   800,
              cursor:       "pointer",
              letterSpacing:"0.3px",
              boxShadow:    "0 4px 20px rgba(79,70,229,0.38)",
            }}
          >
            Proceed to Checkout
          </button>

          <p
            style={{
              textAlign:  "center",
              fontSize:   "11px",
              color:      "#9ca3af",
              marginTop:  "12px",
              lineHeight: 1.5,
            }}
          >
            Secure checkout · 30-day hassle-free returns
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SummaryRow({ label, value, valueColor = "#0f172a" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "14px", color: valueColor, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Navbar({ cartCount }) {
  return (
    <nav
      style={{
        background:     "#0f172a",
        padding:        "0 32px",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        height:         "64px",
        position:       "sticky",
        top:            0,
        zIndex:         100,
        boxShadow:      "0 2px 16px rgba(0,0,0,0.35)",
      }}
    >
      {/* Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
        onClick={() => (window.location.href = "/")}
      >
        <div
          style={{
            width:        "32px",
            height:       "32px",
            background:   "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            borderRadius: "8px",
            display:      "flex",
            alignItems:   "center",
            justifyContent:"center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none"/>
            <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <span style={{ color: "white", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Shop<span style={{ color: "#60a5fa" }}>Ease</span>
        </span>
      </div>

      {/* Page title */}
      <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>Your Cart</span>

      {/* Cart icon */}
      <div
        style={{ position: "relative", cursor: "pointer" }}
        onClick={() => (window.location.href = "/")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="9"  cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        {cartCount > 0 && (
          <div
            style={{
              position:       "absolute",
              top:            "-7px",
              right:          "-7px",
              background:     "#ef4444",
              color:          "white",
              borderRadius:   "50%",
              width:          "18px",
              height:         "18px",
              fontSize:       "10px",
              fontWeight:     700,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              border:         "2px solid #0f172a",
            }}
          >
            {cartCount > 99 ? "99+" : cartCount}
          </div>
        )}
      </div>
    </nav>
  );
}
