"use client";

import { useState } from "react";
import Link from "next/link";
import "../admin/admin.css";
import "./platform.css";

const tenants = [
  { name: "Nova Market", subdomain: "nova", owner: "Owner: Sarah Khan", plan: "Growth", state: "Active", revenue: "$1,840" },
  { name: "Lumen Fashion", subdomain: "lumen", owner: "Owner: Ali Hassan", plan: "Professional", state: "Active", revenue: "$2,260" },
  { name: "Green Basket", subdomain: "green", owner: "Owner: Mariam Noor", plan: "Starter", state: "Provisioning", revenue: "$0" },
];

export default function PlatformAdmin() {
  const [active, setActive] = useState("Tenants");
  return (
    <div className="admin-shell platform-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand"><span>P</span> Platform</Link>
        <nav>
          {["Overview", "Tenants", "Plans", "Features", "Subscriptions", "Audit logs", "Monitoring"].map((label) => (
            <button type="button" key={label} className={active === label ? "active" : ""} onClick={() => setActive(label)}>
              <span>●</span>{label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <label className="admin-search"><span>⌕</span><input placeholder="Search tenants, plans, features..." /></label>
          <div className="admin-actions"><button type="button">♢</button><div className="avatar">SA</div></div>
        </header>
        <div className="admin-content">
          <div className="admin-heading"><div><span className="admin-kicker">Super administration</span><h1>{active}</h1></div><button type="button" className="admin-primary">+ Create tenant</button></div>
          {active === "Overview" ? <PlatformOverview /> : active === "Tenants" ? <TenantTable /> : <FeatureGrid name={active} />}
        </div>
      </main>
    </div>
  );
}

function PlatformOverview() {
  return (
    <>
      <div className="stat-grid">
        <article className="stat"><span>Total tenants</span><strong>1,284</strong><small>+9.1% <em>this month</em></small></article>
        <article className="stat"><span>Monthly revenue</span><strong>$86,420</strong><small>+14.2% <em>this month</em></small></article>
        <article className="stat"><span>Active subscriptions</span><strong>1,102</strong><small>+6.8% <em>this month</em></small></article>
        <article className="stat"><span>Provision failures</span><strong>3</strong><small style={{ color: "#a13b42" }}>Needs review</small></article>
      </div>
      <TenantTable />
    </>
  );
}

function TenantTable() {
  return (
    <section className="panel table-panel">
      <table>
        <thead><tr><th>Tenant</th><th>Owner</th><th>Plan</th><th>Status</th><th>Revenue</th><th>Action</th></tr></thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.subdomain}>
              <td><div className="table-product"><div className="tenant-mark">{tenant.name[0]}</div><div><strong>{tenant.name}</strong><span>{tenant.subdomain}.market.com</span></div></div></td>
              <td>{tenant.owner}</td><td>{tenant.plan}</td>
              <td><span className={`status ${tenant.state === "Active" ? "active" : "processing"}`}>{tenant.state}</span></td>
              <td>{tenant.revenue}</td><td><button type="button" className="row-action">Manage</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FeatureGrid({ name }: { name: string }) {
  const items = name === "Features"
    ? ["Catalog", "Inventory", "Loyalty", "Visual editor", "AI descriptions", "CRM"]
    : name === "Plans"
      ? ["Starter", "Growth", "Professional", "Enterprise"]
      : ["Subscriptions", "Audit trail", "Infrastructure", "Exports"];
  return (
    <div className="feature-grid">
      {items.map((item) => (
        <article className="feature-card" key={item}>
          <div><span>{item[0]}</span><strong>{item}</strong></div>
          <p>{name} configuration and effective entitlement.</p>
          <button type="button">Configure</button>
        </article>
      ))}
    </div>
  );
}
