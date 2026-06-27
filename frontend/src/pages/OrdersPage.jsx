// ── Mock order history ─────────────────────────────────────────────────────────
const ORDERS = [
  {
    id:       "ORD-2026-00341",
    date:     "12 June 2026",
    product:  "Nike Air Max",
    qty:      1,
    amount:   4500,
    status:   "Delivered",
    image:    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    category: "Footwear",
  },
  {
    id:       "ORD-2026-00298",
    date:     "5 June 2026",
    product:  "Smart Watch",
    qty:      1,
    amount:   8999,
    status:   "Shipped",
    image:    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    category: "Electronics",
  },
  {
    id:       "ORD-2026-00271",
    date:     "28 May 2026",
    product:  "Mechanical Keyboard",
    qty:      1,
    amount:   4200,
    status:   "Processing",
    image:    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80",
    category: "Accessories",
  },
];

const STATUS_STYLES = {
  Delivered:  { bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  Shipped:    { bg: "#dbeafe", color: "#1d4ed8", dot: "#2563eb" },
  Processing: { bg: "#fef3c7", color: "#92400e", dot: "#d97706" },
};

export default function OrdersPage() {
  return (
    <div
      style={{
        minHeight:  "100vh",
        background: "#f3f4f6",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
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
              width:         "32px",
              height:        "32px",
              background:    "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius:  "8px",
              display:       "flex",
              alignItems:    "center",
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

        <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>My Orders</span>

        <div
          style={{ cursor: "pointer" }}
          onClick={() => (window.location.href = "/")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "860px",
          margin:   "0 auto",
          padding:  "36px 28px",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize:      "22px",
              fontWeight:    800,
              color:         "#0f172a",
              margin:        "0 0 4px",
              letterSpacing: "-0.4px",
            }}
          >
            Order History
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            {ORDERS.length} orders placed
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {ORDERS.map((order) => {
            const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.Processing;
            return (
              <div
                key={order.id}
                style={{
                  background:   "white",
                  borderRadius: "16px",
                  overflow:     "hidden",
                  boxShadow:    "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                {/* Order header strip */}
                <div
                  style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "center",
                    padding:        "13px 20px",
                    background:     "#f8fafc",
                    borderBottom:   "1px solid #f1f5f9",
                    flexWrap:       "wrap",
                    gap:            "8px",
                  }}
                >
                  <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                        Order ID
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginTop: "2px", fontFamily: "monospace" }}>
                        {order.id}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                        Placed on
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
                        {order.date}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                        Total
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                        ₹{order.amount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div
                    style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          "6px",
                      background:   statusStyle.bg,
                      color:        statusStyle.color,
                      borderRadius: "20px",
                      padding:      "5px 13px",
                      fontSize:     "12px",
                      fontWeight:   700,
                      letterSpacing:"0.3px",
                    }}
                  >
                    <div
                      style={{
                        width:        "7px",
                        height:       "7px",
                        borderRadius: "50%",
                        background:   statusStyle.dot,
                      }}
                    />
                    {order.status}
                  </div>
                </div>

                {/* Product row */}
                <div
                  style={{
                    display:    "flex",
                    alignItems: "center",
                    gap:        "16px",
                    padding:    "16px 20px",
                  }}
                >
                  <div
                    style={{
                      width:        "72px",
                      height:       "72px",
                      borderRadius: "10px",
                      overflow:     "hidden",
                      flexShrink:   0,
                      background:   "#f1f5f9",
                    }}
                  >
                    <img
                      src={order.image}
                      alt={order.product}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>

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
                      {order.category}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      {order.product}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px" }}>
                      Qty: {order.qty}
                    </div>
                  </div>

                  <button
                    onClick={() => (window.location.href = "/")}
                    style={{
                      background:   "transparent",
                      border:       "1.5px solid #e2e8f0",
                      color:        "#374151",
                      padding:      "8px 16px",
                      borderRadius: "8px",
                      fontSize:     "12px",
                      fontWeight:   600,
                      cursor:       "pointer",
                      whiteSpace:   "nowrap",
                    }}
                  >
                    Buy Again
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
