"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Customer = { name: string; email: string; phone: string };
type Order = {
  _id: string;
  number: string;
  status: string;
  currency: string;
  totals: { totalMinor: number };
  createdAt: string;
};

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  ACCOUNT_ALREADY_EXISTS: "An account already exists for this email. Please sign in.",
  RATE_LIMITED: "Too many attempts. Please wait and try again.",
  STORE_UNAVAILABLE: "This store is currently unavailable.",
};

export default function CustomerAccount({
  tenantName,
  tenantSlug,
}: {
  tenantName: string;
  tenantSlug: string;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAccount() {
    const response = await fetch(`/api/store/${tenantSlug}/customers/me`);
    if (!response.ok) {
      setCustomer(null);
      setOrders([]);
      return;
    }
    const payload = await response.json();
    setCustomer(payload.customer);
    const orderResponse = await fetch(`/api/store/${tenantSlug}/customers/orders`);
    if (orderResponse.ok) {
      const orderPayload = await orderResponse.json();
      setOrders(orderPayload.orders);
    }
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/store/${tenantSlug}/customers/me`)
      .then(async (response) => response.ok ? response.json() : null)
      .then(async (payload) => {
        if (!active || !payload?.customer) return;
        setCustomer(payload.customer);
        const orderResponse = await fetch(`/api/store/${tenantSlug}/customers/orders`);
        if (active && orderResponse.ok) {
          const orderPayload = await orderResponse.json();
          setOrders(orderPayload.orders);
        }
      })
      .catch(() => {
        if (active) setError("Could not load your account. Please refresh.");
      });
    return () => {
      active = false;
    };
  }, [tenantSlug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(
        `/api/store/${tenantSlug}/customers/${mode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        setError(messages[payload.error] ?? "Could not sign in. Please try again.");
        return;
      }
      await loadAccount();
      setPassword("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setError("");
    try {
      const response = await fetch(`/api/store/${tenantSlug}/customers/logout`, {
        method: "POST",
      });
      if (!response.ok) {
        setError("Could not sign out. Please try again.");
        return;
      }
      setCustomer(null);
      setOrders([]);
    } catch {
      setError("Network error. Could not sign out.");
    }
  }

  return (
    <main className="container account-page">
      <Link href={`/store/${tenantSlug}`} className="checkout-back">
        ← {tenantName}
      </Link>
      {customer ? (
        <section className="account-card">
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <div className="account-heading">
            <div>
              <p className="eyebrow">Customer account</p>
              <h1>Welcome, {customer.name}</h1>
              <p>{customer.email}</p>
            </div>
            <button type="button" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
          <h2>Your orders</h2>
          {orders.length ? (
            <div className="account-orders">
              {orders.map((order) => (
                <article key={order._id}>
                  <div>
                    <strong>{order.number}</strong>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="account-status">{order.status}</span>
                  <strong>
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: order.currency,
                    }).format(order.totals.totalMinor / 100)}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <p>Your orders will appear here after you complete a purchase.</p>
          )}
        </section>
      ) : (
        <form className="account-card account-form" onSubmit={submit}>
          <p className="eyebrow">{tenantName}</p>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          {mode === "register" && (
            <label>
              Full name
              <input
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              type="password"
              required
              minLength={12}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="checkout-primary" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <button
            className="account-mode-button"
            type="button"
            onClick={() => {
              setMode((current) => current === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "New here? Create an account" : "Already registered? Sign in"}
          </button>
        </form>
      )}
    </main>
  );
}
