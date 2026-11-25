"use client";

import { useState } from "react";
import Link from "next/link";

export type TenantProduct = {
  _id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  stock: number;
};

type CartLine = TenantProduct & { quantity: number };

export default function TenantStorefront({
  tenantName,
  tenantSlug,
  products,
}: {
  tenantName: string;
  tenantSlug: string;
  products: TenantProduct[];
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(`cart:${tenantSlug}`) ?? "[]") as CartLine[];
    } catch {
      return [];
    }
  });

  function saveCart(next: CartLine[]) {
    setCart(next);
    window.localStorage.setItem(`cart:${tenantSlug}`, JSON.stringify(next));
  }

  function add(product: TenantProduct) {
    const existing = cart.find((line) => line._id === product._id);
    const next = existing
      ? cart.map((line) =>
          line._id === product._id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        )
      : [...cart, { ...product, quantity: 1 }];
    saveCart(next);
  }

  function changeQuantity(productId: string, delta: number) {
    saveCart(
      cart
        .map((line) =>
          line._id === productId
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fb", color: "#172033" }}>
      <header style={{ background: "white", borderBottom: "1px solid #e4e7ec", padding: "20px 32px", display: "flex", justifyContent: "space-between" }}>
        <strong>{tenantName}</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href={`/account?store=${encodeURIComponent(tenantSlug)}`}>Account</Link>
          <button type="button" onClick={() => setCartOpen(true)}>Cart ({itemCount})</button>
        </div>
      </header>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
        <h1>{tenantName}</h1>
        <p>{products.length} products</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {products.map((product) => (
            <article key={product._id} style={{ background: "white", borderRadius: 12, padding: 16 }}>
              {product.image && <img src={product.image} alt="" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }} />}
              <h2 style={{ fontSize: 18 }}>{product.name}</h2>
              <p>{product.category}</p>
              <strong>${product.price.toFixed(2)}</strong>
              <p>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
              <button type="button" disabled={product.stock < 1} onClick={() => add(product)}>
                {product.stock > 0 ? "Add to cart" : "Unavailable"}
              </button>
            </article>
          ))}
        </div>
        {!products.length && <p>No products are available yet.</p>}
      </section>
      {cartOpen && (
        <div role="dialog" aria-label="Shopping cart" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "flex", justifyContent: "flex-end" }}>
          <aside style={{ width: "min(380px, 100%)", background: "white", padding: 24 }}>
            <button type="button" onClick={() => setCartOpen(false)}>Close</button>
            <h2>Shopping cart</h2>
            {cart.map((line) => (
              <div key={line._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #e4e7ec", paddingBlock: 12 }}>
                <div><strong>{line.name}</strong><br />${line.price.toFixed(2)}</div>
                <div>
                  <button type="button" onClick={() => changeQuantity(line._id, -1)}>−</button>
                  <span style={{ marginInline: 8 }}>{line.quantity}</span>
                  <button type="button" onClick={() => changeQuantity(line._id, 1)}>+</button>
                </div>
              </div>
            ))}
            {!cart.length && <p>Your cart is empty.</p>}
            {cart.length > 0 && <strong>Subtotal: ${subtotal.toFixed(2)}</strong>}
            {cart.length > 0 && (
              <Link
                href={`/checkout?store=${encodeURIComponent(tenantSlug)}`}
                style={{
                  display: "block",
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: "#172033",
                  color: "white",
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                Continue to checkout
              </Link>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
