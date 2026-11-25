import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f7fb", color: "#172033" }}>
      <section style={{ width: "min(760px, calc(100% - 32px))", textAlign: "center" }}>
        <p style={{ color: "#5b6b93", letterSpacing: "0.12em" }}>MULTI-TENANT COMMERCE SaaS</p>
        <h1 style={{ fontSize: "clamp(42px, 8vw, 72px)", margin: "12px 0" }}>Your store. Your brand. One platform.</h1>
        <p style={{ color: "#667085", maxWidth: 600, margin: "0 auto 28px" }}>Create an independent storefront, manage tenant products and orders, and operate stores through a central platform dashboard.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/register" style={{ background: "#2f4e8f", color: "white", padding: "13px 18px", borderRadius: 8 }}>Create a store</Link>
          <Link href="/admin" style={{ background: "white", color: "#172033", padding: "13px 18px", borderRadius: 8, border: "1px solid #d0d5dd" }}>Store admin</Link>
          <Link href="/super-admin" style={{ background: "white", color: "#172033", padding: "13px 18px", borderRadius: 8, border: "1px solid #d0d5dd" }}>Super Admin</Link>
        </div>
      </section>
    </main>
  );
}
