import { useState, useCallback } from "react";
import ChatWidget from "../components/ChatWidget";

// ─── Product Catalogue ────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1,  name: "Nike Air Max",               price: 4500,  image: "NA", category: "Footwear",     rating: 4.6, reviews: 312, badge: "New"        },
  { id: 2,  name: "Samsung Earbuds",             price: 3200,  image: "SE", category: "Electronics",  rating: 4.3, reviews: 189, badge: null          },
  { id: 3,  name: "Laptop Stand",                price: 1500,  image: "LS", category: "Accessories",  rating: 4.5, reviews: 234, badge: "Bestseller"  },
  { id: 4,  name: "Wireless Mouse",              price: 999,   image: "WM", category: "Electronics",  rating: 4.7, reviews: 445, badge: "Top Rated"   },
  { id: 5,  name: "Bluetooth Speaker",           price: 2800,  image: "BS", category: "Electronics",  rating: 4.4, reviews: 167, badge: null          },
  { id: 6,  name: "Yoga Mat",                    price: 800,   image: "YM", category: "Fitness",      rating: 4.2, reviews: 98,  badge: null          },
  { id: 7,  name: "Coffee Maker",                price: 5500,  image: "CM", category: "Kitchen",      rating: 4.8, reviews: 521, badge: "Bestseller"  },
  { id: 8,  name: "Running Shoes",               price: 3800,  image: "RS", category: "Footwear",     rating: 4.5, reviews: 203, badge: "New"         },
  { id: 9,  name: "Smart Watch",                 price: 8999,  image: "SW", category: "Electronics",  rating: 4.5, reviews: 234, badge: "Bestseller"  },
  { id: 10, name: "Noise Cancelling Headphones", price: 6500,  image: "NC", category: "Electronics",  rating: 4.3, reviews: 189, badge: null          },
  { id: 11, name: "Mechanical Keyboard",         price: 4200,  image: "MK", category: "Accessories",  rating: 4.7, reviews: 312, badge: "Top Rated"   },
  { id: 12, name: "Desk Lamp",                   price: 1200,  image: "DL", category: "Accessories",  rating: 4.1, reviews: 98,  badge: null          },
  { id: 13, name: "Water Bottle",                price: 599,   image: "WB", category: "Fitness",      rating: 4.6, reviews: 445, badge: "Top Rated"   },
  { id: 14, name: "Resistance Bands",            price: 799,   image: "RB", category: "Fitness",      rating: 4.4, reviews: 167, badge: null          },
  { id: 15, name: "Air Fryer",                   price: 7500,  image: "AF", category: "Kitchen",      rating: 4.8, reviews: 521, badge: "Bestseller"  },
  { id: 16, name: "Protein Shaker",              price: 449,   image: "PS", category: "Fitness",      rating: 4.2, reviews: 203, badge: null          },
];

const CATEGORIES = ["All", "Electronics", "Footwear", "Accessories", "Fitness", "Kitchen"];

const SORT_OPTIONS = [
  { value: "featured",   label: "Featured"             },
  { value: "price-asc",  label: "Price: Low to High"   },
  { value: "price-desc", label: "Price: High to Low"   },
  { value: "top-rated",  label: "Top Rated"             },
];

// ─── Image-placeholder colour palette (per initial) ──────────────────────────
const PLACEHOLDER_COLORS = {
  NA: { bg: "#dbeafe", text: "#1d4ed8" },
  SE: { bg: "#fce7f3", text: "#9d174d" },
  LS: { bg: "#d1fae5", text: "#065f46" },
  WM: { bg: "#ede9fe", text: "#5b21b6" },
  BS: { bg: "#fef3c7", text: "#92400e" },
  YM: { bg: "#dcfce7", text: "#15803d" },
  CM: { bg: "#fee2e2", text: "#991b1b" },
  RS: { bg: "#e0e7ff", text: "#3730a3" },
  SW: { bg: "#fef9c3", text: "#713f12" },
  NC: { bg: "#fce7f3", text: "#831843" },
  MK: { bg: "#f0fdf4", text: "#166534" },
  DL: { bg: "#fefce8", text: "#854d0e" },
  WB: { bg: "#ecfeff", text: "#155e75" },
  RB: { bg: "#fdf4ff", text: "#701a75" },
  AF: { bg: "#fff7ed", text: "#9a3412" },
  PS: { bg: "#f0f9ff", text: "#0c4a6e" },
};

const BADGE_STYLES = {
  Bestseller: { bg: "#ea580c", color: "#fff" },
  "Top Rated": { bg: "#16a34a", color: "#fff" },
  New: { bg: "#2563eb", color: "#fff" },
};

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ rating, reviews }) {
  const fullStars  = Math.floor(rating);
  const hasHalf    = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
      <span style={{ color: "#f59e0b", fontSize: "14px", letterSpacing: "1px" }}>
        {"★".repeat(fullStars)}
        {hasHalf ? "★" : ""}
        {"☆".repeat(emptyStars)}
      </span>
      <span style={{ fontSize: "12px", color: "#6b7280" }}>
        {rating.toFixed(1)} ({reviews.toLocaleString()})
      </span>
    </div>
  );
}

// ─── Toast Component ─────────────────────────────────────────────────────────
function Toast({ visible }) {
  return (
    <div
      style={{
        position:        "fixed",
        bottom:          "88px",
        right:           "28px",
        background:      "#1a1a2e",
        color:           "#fff",
        padding:         "10px 20px",
        borderRadius:    "8px",
        fontSize:        "13px",
        fontWeight:      600,
        boxShadow:       "0 4px 20px rgba(0,0,0,0.25)",
        zIndex:          9999,
        opacity:         visible ? 1 : 0,
        transform:       visible ? "translateY(0)" : "translateY(12px)",
        transition:      "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents:   "none",
        letterSpacing:   "0.3px",
      }}
    >
      Added to cart
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StorePage() {
  const [chatOpen,       setChatOpen]       = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortOption,     setSortOption]     = useState("featured");
  const [cartCount,      setCartCount]      = useState(0);
  const [wishlist,       setWishlist]       = useState(new Set());
  const [toastVisible,   setToastVisible]   = useState(false);
  const [toastTimer,     setToastTimer]     = useState(null);
  const [hoveredCard,    setHoveredCard]    = useState(null);
  const [hoveredCartBtn, setHoveredCartBtn] = useState(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = PRODUCTS.filter((p) => {
    const matchesCategory =
      activeCategory === "All" || p.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === "price-asc")  return a.price  - b.price;
    if (sortOption === "price-desc") return b.price  - a.price;
    if (sortOption === "top-rated")  return b.rating - a.rating;
    return a.id - b.id; // "featured" — original order
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(() => {
    setCartCount((c) => c + 1);
    if (toastTimer) clearTimeout(toastTimer);
    setToastVisible(true);
    const timer = setTimeout(() => setToastVisible(false), 2000);
    setToastTimer(timer);
  }, [toastTimer]);

  const toggleWishlist = useCallback((id) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          background:      "#0f172a",
          padding:         "0 32px",
          display:         "flex",
          justifyContent:  "space-between",
          alignItems:      "center",
          height:          "64px",
          position:        "sticky",
          top:             0,
          zIndex:          100,
          boxShadow:       "0 2px 16px rgba(0,0,0,0.35)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <div
            style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
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

        {/* Nav Links */}
        <div style={{ display: "flex", gap: "28px", color: "#94a3b8", fontSize: "14px", fontWeight: 500 }}>
          {["Home", "Products", "Orders", "Contact"].map((link) => (
            <span
              key={link}
              style={{ cursor: "pointer", transition: "color 0.2s", color: link === "Home" ? "white" : "#94a3b8" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.color = link === "Home" ? "white" : "#94a3b8")}
            >
              {link}
            </span>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", width: "380px", flexShrink: 0 }}>
          <svg
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            id="store-search-input"
            type="text"
            placeholder="Search products or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width:        "100%",
              height:       "38px",
              background:   "#1e293b",
              border:       "1.5px solid #334155",
              borderRadius: "10px",
              color:        "white",
              fontSize:     "13.5px",
              padding:      "0 16px 0 38px",
              outline:      "none",
              boxSizing:    "border-box",
              transition:   "border-color 0.2s",
            }}
            onFocus={(e)  => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e)   => (e.target.style.borderColor = "#334155")}
          />
        </div>

        {/* Right Icons */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {/* Cart with badge */}
          <div style={{ position: "relative", cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="9"  cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && (
              <div
                style={{
                  position:      "absolute",
                  top:           "-7px",
                  right:         "-7px",
                  background:    "#ef4444",
                  color:         "white",
                  borderRadius:  "50%",
                  width:         "18px",
                  height:        "18px",
                  fontSize:      "10px",
                  fontWeight:    700,
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                  lineHeight:    1,
                  border:        "2px solid #0f172a",
                }}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </div>
            )}
          </div>

          {/* User */}
          <span style={{ cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
        </div>
      </nav>

      {/* ── Category Filter Bar ──────────────────────────────────────────────── */}
      <div
        style={{
          background:   "white",
          borderBottom: "1px solid #e5e7eb",
          padding:      "0 32px",
          overflowX:    "auto",
          display:      "flex",
          gap:          "10px",
          alignItems:   "center",
          height:       "52px",
          boxShadow:    "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              id={`category-filter-${cat.toLowerCase()}`}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink:   0,
                padding:      "6px 18px",
                borderRadius: "20px",
                border:       isActive ? "none" : "1.5px solid #d1d5db",
                background:   isActive ? "#2563eb" : "white",
                color:        isActive ? "white"   : "#4b5563",
                fontSize:     "13px",
                fontWeight:   isActive ? 700 : 500,
                cursor:       "pointer",
                transition:   "all 0.18s ease",
                letterSpacing:"0.2px",
                whiteSpace:   "nowrap",
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "white";   e.currentTarget.style.borderColor = "#d1d5db"; } }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background:  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #4f46e5 100%)",
          padding:     "52px 40px",
          textAlign:   "center",
          position:    "relative",
          overflow:    "hidden",
        }}
      >
        {/* decorative blobs */}
        <div style={{ position:"absolute", top:"-60px", left:"-60px",  width:"240px", height:"240px", background:"rgba(99,102,241,0.18)", borderRadius:"50%", filter:"blur(60px)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"-40px", right:"-40px", width:"200px", height:"200px", background:"rgba(59,130,246,0.18)", borderRadius:"50%", filter:"blur(50px)", pointerEvents:"none" }}/>

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-block", background:"rgba(255,255,255,0.1)", borderRadius:"20px", padding:"4px 16px", fontSize:"12px", fontWeight:700, color:"#93c5fd", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"16px", backdropFilter:"blur(8px)" }}>
            Summer Sale — Up to 60% Off
          </div>
          <h1 style={{ color:"white", fontSize:"44px", fontWeight:900, marginBottom:"12px", lineHeight:1.15, letterSpacing:"-1px" }}>
            Shop Smarter,<br/>Shop Easier
          </h1>
          <p style={{ color:"#cbd5e1", fontSize:"16px", marginBottom:"28px", maxWidth:"480px", margin:"0 auto 28px" }}>
            Premium products with hassle-free returns. Need help? Chat with our AI support agent.
          </p>
          <div style={{ display:"flex", gap:"14px", justifyContent:"center" }}>
            <button
              style={{ background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"white", border:"none", padding:"13px 36px", borderRadius:"10px", fontSize:"15px", cursor:"pointer", fontWeight:700, letterSpacing:"0.3px", boxShadow:"0 4px 20px rgba(79,70,229,0.45)" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Shop Now
            </button>
            <button
              style={{ background:"rgba(255,255,255,0.1)", color:"white", border:"1.5px solid rgba(255,255,255,0.25)", padding:"13px 28px", borderRadius:"10px", fontSize:"15px", cursor:"pointer", fontWeight:600, backdropFilter:"blur(8px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            >
              Chat with AI
            </button>
          </div>
        </div>
      </div>

      {/* ── Products Section ────────────────────────────────────────────────── */}
      <div style={{ padding: "36px 32px", maxWidth: "1300px", margin: "0 auto" }}>

        {/* Section Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h2 style={{ fontSize:"22px", fontWeight:800, color:"#0f172a", margin:0, letterSpacing:"-0.5px" }}>
              Featured Products
            </h2>
            <p style={{ margin:"4px 0 0", fontSize:"13px", color:"#6b7280" }}>
              Showing {sorted.length} of {PRODUCTS.length} products
            </p>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <label htmlFor="sort-select" style={{ fontSize:"13px", color:"#4b5563", fontWeight:500 }}>Sort by:</label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{
                border:       "1.5px solid #d1d5db",
                borderRadius: "8px",
                padding:      "7px 32px 7px 12px",
                fontSize:     "13px",
                color:        "#1e293b",
                background:   "white",
                cursor:       "pointer",
                fontWeight:   500,
                outline:      "none",
                appearance:   "none",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat:   "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:"1px", background:"linear-gradient(to right, #e2e8f0, transparent)", marginBottom:"24px" }}/>

        {/* No Results */}
        {sorted.length === 0 ? (
          <div
            style={{
              textAlign:   "center",
              padding:     "80px 20px",
              background:  "white",
              borderRadius:"16px",
              boxShadow:   "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize:"48px", marginBottom:"16px", color:"#d1d5db" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ display:"block", margin:"0 auto 16px" }}>
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <p style={{ fontSize:"18px", fontWeight:700, color:"#374151", marginBottom:"6px" }}>No products found</p>
            <p style={{ fontSize:"14px", color:"#9ca3af" }}>Try a different search term or category.</p>
          </div>
        ) : (
          /* Product Grid */
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap:                 "20px",
            }}
          >
            {sorted.map((p) => {
              const colors    = PLACEHOLDER_COLORS[p.image] || { bg: "#e8edf8", text: "#2563eb" };
              const isWished  = wishlist.has(p.id);
              const isHovered = hoveredCard === p.id;
              const btnHovered= hoveredCartBtn === p.id;

              return (
                <div
                  key={p.id}
                  style={{
                    background:   "white",
                    borderRadius: "16px",
                    overflow:     "hidden",
                    boxShadow:    isHovered
                      ? "0 12px 40px rgba(0,0,0,0.14)"
                      : "0 2px 12px rgba(0,0,0,0.07)",
                    cursor:       "pointer",
                    transform:    isHovered ? "translateY(-6px)" : "translateY(0)",
                    transition:   "transform 0.22s ease, box-shadow 0.22s ease",
                    display:      "flex",
                    flexDirection:"column",
                    position:     "relative",
                  }}
                  onMouseEnter={() => setHoveredCard(p.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Badge */}
                  {p.badge && (
                    <div
                      style={{
                        position:    "absolute",
                        top:         "12px",
                        left:        "12px",
                        background:  BADGE_STYLES[p.badge]?.bg   || "#6b7280",
                        color:       BADGE_STYLES[p.badge]?.color || "#fff",
                        fontSize:    "10px",
                        fontWeight:  700,
                        padding:     "3px 10px",
                        borderRadius:"20px",
                        letterSpacing:"0.5px",
                        textTransform:"uppercase",
                        zIndex:       2,
                        boxShadow:   "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {p.badge}
                    </div>
                  )}

                  {/* Wishlist Heart */}
                  <button
                    id={`wishlist-btn-${p.id}`}
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                    style={{
                      position:   "absolute",
                      top:        "10px",
                      right:      "10px",
                      background: isWished ? "#fee2e2" : "rgba(255,255,255,0.85)",
                      border:     "none",
                      borderRadius:"50%",
                      width:      "32px",
                      height:     "32px",
                      display:    "flex",
                      alignItems: "center",
                      justifyContent:"center",
                      cursor:     "pointer",
                      zIndex:     2,
                      backdropFilter:"blur(4px)",
                      boxShadow:  "0 2px 8px rgba(0,0,0,0.12)",
                      transition: "transform 0.18s ease, background 0.18s ease",
                      transform:  isWished ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill={isWished ? "#ef4444" : "none"}
                      stroke={isWished ? "#ef4444" : "#6b7280"}
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>

                  {/* Image Placeholder */}
                  <div
                    style={{
                      background:     colors.bg,
                      height:         "160px",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      flexDirection:  "column",
                      gap:            "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize:      "28px",
                        fontWeight:    900,
                        color:         colors.text,
                        letterSpacing: "2px",
                        fontFamily:    "monospace",
                      }}
                    >
                      {p.image}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize:"11px", color:"#6366f1", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:"4px" }}>
                      {p.category}
                    </div>
                    <div style={{ fontSize:"15px", fontWeight:700, color:"#0f172a", marginBottom:"6px", lineHeight:1.3 }}>
                      {p.name}
                    </div>

                    <StarRating rating={p.rating} reviews={p.reviews} />

                    <div style={{ marginTop:"auto", display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"12px", borderTop:"1px solid #f1f5f9" }}>
                      <div>
                        <span style={{ fontSize:"19px", fontWeight:800, color:"#0f172a" }}>
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                        <span style={{ fontSize:"11px", color:"#9ca3af", display:"block", marginTop:"1px" }}>
                          Free delivery
                        </span>
                      </div>
                      <button
                        id={`add-to-cart-${p.id}`}
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
                        onMouseEnter={() => setHoveredCartBtn(p.id)}
                        onMouseLeave={() => setHoveredCartBtn(null)}
                        style={{
                          background:   btnHovered
                            ? "linear-gradient(135deg,#1d4ed8,#4f46e5)"
                            : "linear-gradient(135deg,#2563eb,#6366f1)",
                          color:        "white",
                          border:       "none",
                          padding:      "9px 16px",
                          borderRadius: "9px",
                          fontSize:     "12.5px",
                          cursor:       "pointer",
                          fontWeight:   700,
                          letterSpacing:"0.3px",
                          boxShadow:    btnHovered
                            ? "0 4px 16px rgba(79,70,229,0.5)"
                            : "0 2px 8px rgba(79,70,229,0.3)",
                          transform:    btnHovered ? "scale(1.04)" : "scale(1)",
                          transition:   "all 0.18s ease",
                          display:      "flex",
                          alignItems:   "center",
                          gap:          "6px",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <circle cx="9"  cy="21" r="1"/>
                          <circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                        </svg>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background:  "#0f172a",
          color:       "#64748b",
          textAlign:   "center",
          padding:     "28px",
          fontSize:    "13px",
          marginTop:   "24px",
          borderTop:   "1px solid #1e293b",
        }}
      >
        <div style={{ marginBottom:"8px", display:"flex", justifyContent:"center", gap:"24px", fontSize:"12px" }}>
          {["Privacy Policy", "Terms of Service", "Support", "Careers"].map((link) => (
            <span key={link} style={{ cursor:"pointer", color:"#475569" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >
              {link}
            </span>
          ))}
        </div>
        © 2026 ShopEase · All rights reserved ·{" "}
        <span
          style={{ color:"#3b82f6", cursor:"pointer", fontWeight:600 }}
          onClick={() => (window.location.href = "/admin")}
        >
          Admin
        </span>
      </footer>

      {/* ── Toast Notification ─────────────────────────────────────────────── */}
      <Toast visible={toastVisible} />

      {/* ── Chat Widget ────────────────────────────────────────────────────── */}
      <ChatWidget open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  );
}