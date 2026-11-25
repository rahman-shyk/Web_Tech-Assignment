"use client";

import { useState } from "react";
import Link from "next/link";
import { products } from "@/lib/data/products";
import "./admin.css";

const nav = [
  ["Overview", "⌂"],
  ["Orders", "▣"],
  ["Products", "▦"],
  ["Customers", "♙"],
  ["Inventory", "□"],
  ["Discounts", "◇"],
  ["Analytics", "↗"],
  ["Settings", "⚙"],
];

export default function AdminShell() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand"><span>N</span> Nova Market</Link>
        <nav>
          {nav.map(([label, icon]) => (
            <button
              type="button"
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => setActive(label)}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <Link className="view-store" href="/">View storefront ↗</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="mobile-menu">☰</button>
          <label className="admin-search">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, products, customers..." />
          </label>
          <div className="admin-actions">
            <button type="button" aria-label="Notifications">♢</button>
            <div className="avatar">AD</div>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-heading">
            <div>
              <span className="admin-kicker">Store administration</span>
              <h1>{active}</h1>
            </div>
            {active === "Products" && <button type="button" className="admin-primary">+ Add product</button>}
            {active === "Orders" && <button type="button" className="admin-primary">Export orders</button>}
          </div>

          {active === "Overview" && <Overview />}
          {active === "Products" && <ProductTable search={search} />}
          {active === "Orders" && <OrdersTable />}
          {active === "Customers" && <CustomersTable />}
          {["Inventory", "Discounts", "Analytics", "Settings"].includes(active) && (
            <EmptyModule name={active} />
          )}
        </div>
      </main>
    </div>
  );
}

function Overview() {
  return (
    <>
      <div className="stat-grid">
        <Stat label="Net sales" value="$24,820" change="+12.5%" />
        <Stat label="Orders" value="1,284" change="+8.2%" />
        <Stat label="Customers" value="842" change="+5.4%" />
        <Stat label="Conversion" value="3.42%" change="+0.8%" />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><span>Sales overview</span><strong>$24,820</strong></div><button type="button">Last 30 days⌄</button></div>
          <div className="chart">
            {[42,55,48,66,61,78,72,86,74,91,83,96].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="chart-labels"><span>Jun 1</span><span>Jun 8</span><span>Jun 15</span><span>Jun 22</span><span>Jun 30</span></div>
        </section>
        <section className="panel">
          <div className="panel-heading"><strong>Sales by channel</strong><button type="button">•••</button></div>
          <div className="channel"><span><i className="purple" />Online store</span><strong>68%</strong></div>
          <div className="channel"><span><i className="blue" />Marketplace</span><strong>21%</strong></div>
          <div className="channel"><span><i className="orange" />Social</span><strong>11%</strong></div>
        </section>
      </div>
      <section className="panel recent">
        <div className="panel-heading"><strong>Recent orders</strong><button type="button">View all</button></div>
        <OrdersTable compact />
      </section>
    </>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change: string }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{change} <em>vs last month</em></small></article>;
}

function ProductTable({ search }: { search: string }) {
  const filtered = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="panel table-panel">
      <table>
        <thead><tr><th>Product</th><th>Status</th><th>Inventory</th><th>Price</th><th>Sales</th></tr></thead>
        <tbody>
          {filtered.map((product, index) => (
            <tr key={product.id}>
              <td><div className="table-product"><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{product.category}</span></div></div></td>
              <td><span className="status active">Active</span></td>
              <td>{product.stock} in stock</td>
              <td>${product.price.toFixed(2)}</td>
              <td>{24 + index * 13}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function OrdersTable({ compact = false }: { compact?: boolean }) {
  const orders = [
    ["#10482", "Sarah Khan", "Aurora Headphones", "$149.00", "Paid", "Just now"],
    ["#10481", "Ali Hassan", "Nova Backpack", "$92.00", "Processing", "12 min ago"],
    ["#10480", "Mariam Noor", "Luma Watch S2", "$219.00", "Paid", "34 min ago"],
    ["#10479", "Omar Aziz", "Terra Sneakers", "$118.00", "Refunded", "1 hr ago"],
  ];
  return (
    <section className={compact ? "table-compact" : "panel table-panel"}>
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Total</th><th>Payment</th><th>Time</th></tr></thead>
        <tbody>{orders.map((order) => (
          <tr key={order[0]}>
            <td><strong>{order[0]}</strong></td><td>{order[1]}</td><td>{order[2]}</td><td>{order[3]}</td>
            <td><span className={`status ${order[4].toLowerCase()}`}>{order[4]}</span></td><td>{order[5]}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

function CustomersTable() {
  return (
    <section className="panel table-panel">
      <table><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Spent</th><th>Status</th></tr></thead>
        <tbody>
          {["Sarah Khan", "Ali Hassan", "Mariam Noor"].map((name, index) => (
            <tr key={name}><td><strong>{name}</strong></td><td>{name.toLowerCase().replace(" ", ".")}@example.com</td><td>{index + 2}</td><td>${(index + 1) * 149}.00</td><td><span className="status active">Active</span></td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function EmptyModule({ name }: { name: string }) {
  return (
    <section className="panel module-empty">
      <span>⚙</span>
      <h2>{name}</h2>
      <p>This module is ready for configuration and live tenant data.</p>
      <button type="button" className="admin-primary">Configure {name}</button>
    </section>
  );
}
