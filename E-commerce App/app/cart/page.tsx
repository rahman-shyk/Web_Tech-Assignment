import Link from "next/link";
import { products } from "@/lib/data/products";

export default function CartPage() {
  const product = products[0];
  return (
    <main className="container" style={{ minHeight: "100vh", paddingBlock: 48 }}>
      <Link href="/" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 800 }}>← Continue shopping</Link>
      <h1>Shopping cart</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 16, alignItems: "center", background: "white", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
          <img src={product.image} alt="" style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10 }} />
          <div><strong>{product.name}</strong><br /><span style={{ color: "var(--muted)" }}>Qty: 1</span></div>
          <strong>${product.price.toFixed(2)}</strong>
        </div>
        <aside style={{ background: "white", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <h2>Summary</h2>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}><span>Subtotal</span><strong>$149.00</strong></div>
          <Link href="/checkout" style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 20, borderRadius: 8, background: "var(--brand)", color: "white", textDecoration: "none", fontWeight: 800 }}>Checkout</Link>
        </aside>
      </div>
    </main>
  );
}
