"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { products, type Product } from "@/lib/data/products";
import "./storefront.css";

type CartLine = Product & { quantity: number };

export default function Storefront() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartLine[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem("nova-cart");
      return saved ? (JSON.parse(saved) as CartLine[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "ur">("en");


  useEffect(() => {
    window.localStorage.setItem("nova-cart", JSON.stringify(cart));
  }, [cart]);

  const categories = ["All", ...new Set(products.map((product) => product.category))];
  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (category === "All" || product.category === category) &&
          product.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [category, search],
  );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.id === id
            ? { ...line, quantity: Math.max(0, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  return (
    <div className="storefront" dir={language === "ur" ? "rtl" : "ltr"}>
      <div className="announcement">Free delivery on orders over $100</div>
      <header className="store-header">
        <div className="container nav">
          <Link href="/" className="brand" aria-label="Commerce SaaS home">
            <span className="brand-mark">N</span>
            <span>Nova Market</span>
          </Link>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={language === "ur" ? "مصنوعات تلاش کریں" : "Search products"}
            />
          </label>
          <nav className="nav-actions" aria-label="Account navigation">
            <button
              type="button"
              className="language"
              onClick={() => setLanguage((value) => (value === "en" ? "ur" : "en"))}
            >
              {language === "en" ? "UR" : "EN"}
            </button>
            <Link href="/account">Account</Link>
            <button type="button" className="cart-button" onClick={() => setCartOpen(true)}>
              Cart <span>{itemCount}</span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">NEW COLLECTION 2026</span>
              <h1>{language === "ur" ? "روزمرہ کے لیے ڈیولپ کی گئی" : "Designed for everyday living"}</h1>
              <p>
                Thoughtful essentials, quality materials, and modern design for your
                home and routine.
              </p>
              <a href="#catalog" className="primary-button">Shop collection</a>
            </div>
            <div className="hero-image" role="img" aria-label="Modern lifestyle products">
              <span>Up to 30% off</span>
            </div>
          </div>
        </section>

        <section className="container catalog" id="catalog">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CURATED FOR YOU</span>
              <h2>{language === "ur" ? "مقبول مصنوعات" : "Popular products"}</h2>
            </div>
            <div className="category-list" aria-label="Product categories">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={item === category ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {filtered.length ? (
            <div className="product-grid">
              {filtered.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    {product.badge && <span className="badge">{product.badge}</span>}
                    <img src={product.image} alt={product.name} />
                    <button type="button" onClick={() => addToCart(product)}>
                      Add to cart
                    </button>
                  </div>
                  <div className="product-info">
                    <span className="category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <div className="rating">
                      <span>★ {product.rating}</span>
                      <small>{product.reviews} reviews</small>
                    </div>
                    <div className="price">
                      <strong>${product.price.toFixed(2)}</strong>
                      {product.compareAt && <del>${product.compareAt.toFixed(2)}</del>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">No products match your search.</div>
          )}
        </section>

        <section className="container trust-grid">
          <article><strong>Free shipping</strong><span>On orders over $100</span></article>
          <article><strong>Easy returns</strong><span>30-day return window</span></article>
          <article><strong>Secure payment</strong><span>Encrypted checkout</span></article>
          <article><strong>Human support</strong><span>Mon–Sat, 9am–6pm</span></article>
        </section>
      </main>

      {cartOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()} aria-label="Shopping cart">
            <div className="drawer-header">
              <h2>Shopping cart <span>{itemCount}</span></h2>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button>
            </div>
            <div className="cart-lines">
              {cart.length ? cart.map((line) => (
                <div className="cart-line" key={line.id}>
                  <img src={line.image} alt="" />
                  <div>
                    <strong>{line.name}</strong>
                    <span>${line.price.toFixed(2)}</span>
                    <div className="quantity">
                      <button type="button" onClick={() => changeQuantity(line.id, -1)}>−</button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => changeQuantity(line.id, 1)}>+</button>
                    </div>
                  </div>
                </div>
              )) : <div className="empty-cart">Your cart is empty.</div>}
            </div>
            {cart.length > 0 && (
              <div className="drawer-footer">
                <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
                <Link href="/checkout" onClick={() => setCartOpen(false)}>Checkout securely</Link>
                <Link className="view-cart" href="/cart" onClick={() => setCartOpen(false)}>View cart</Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
