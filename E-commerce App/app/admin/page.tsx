"use client";

import { FormEvent, useState } from "react";
import {
  allowedOrderTransitions,
  type OrderStatus,
} from "@/lib/orders/state";

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
  active: boolean;
};

type Order = {
  id: string;
  number: string;
  customer: { name: string; email: string };
  items: { name: string; quantity: number }[];
  totals: { totalMinor: number };
  currency: string;
  status: OrderStatus;
  createdAt: string;
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [section, setSection] = useState<"Products" | "Orders">("Products");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/products");
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Could not load products");
    else setProducts(payload.products ?? []);
  }

  async function loadOrders() {
    const response = await fetch("/api/admin/orders");
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Could not load orders");
    else setOrders(payload.orders ?? []);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: data.get("slug"),
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    if (!response.ok) {
      setError("Login failed or store is unavailable.");
      return;
    }
    setLoggedIn(true);
    await load();
    await loadOrders();
  }

  async function updateOrderStatus(order: Order, status: OrderStatus) {
    setError("");
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(
        payload.error === "INVALID_TRANSITION"
          ? `This order cannot move to ${status}. Refresh the list and try again.`
          : payload.error ?? "Could not update order",
      );
      return;
    }
    await loadOrders();
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        category: data.get("category"),
        price: Number(data.get("price")),
        stock: Number(data.get("stock")),
        image: data.get("image") || "",
        active: true,
      }),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Could not create product");
    else {
      event.currentTarget.reset();
      await load();
    }
  }

  async function removeProduct(productId: string) {
    const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (response.ok) await load();
  }

  async function editProduct(product: Product) {
    const name = window.prompt("Product name", product.name)?.trim();
    if (!name) return;
    const category = window.prompt("Category", product.category)?.trim();
    if (!category) return;
    const priceText = window.prompt("Price", String(product.price))?.trim();
    const stockText = window.prompt("Stock", String(product.stock))?.trim();
    if (!priceText || !stockText) return;
    const price = Number(priceText);
    const stock = Number(stockText);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      setError("Enter a valid price and whole-number stock.");
      return;
    }
    const response = await fetch(`/api/admin/products/${product._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, price, stock }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Could not update product");
      return;
    }
    await load();
  }

  if (!loggedIn) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f7fb" }}>
        <form onSubmit={login} style={{ width: 360, padding: 32, background: "white", borderRadius: 16, display: "grid", gap: 12 }}>
          <h1>Store owner login</h1>
          {error && <p style={{ color: "#b42318" }}>{error}</p>}
          <input name="slug" required pattern="[a-z0-9-]{2,63}" placeholder="Store slug" />
          <input name="email" type="email" required placeholder="Owner email" />
          <input name="password" type="password" minLength={12} required placeholder="Password" />
          <button type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#172033", padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1>Store dashboard</h1>
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginBlock: 18 }}>
          {(["Products", "Orders"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSection(item);
                if (item === "Orders") void loadOrders();
              }}
              aria-pressed={section === item}
            >
              {item}
            </button>
          ))}
        </div>
        {section === "Products" && (
          <>
            <form onSubmit={createProduct} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 8, background: "white", padding: 16, borderRadius: 12 }}>
              <input name="name" required placeholder="Product name" />
              <input name="category" required placeholder="Category" />
              <input name="price" required type="number" min="0.01" step="0.01" placeholder="Price" />
              <input name="stock" required type="number" min="0" placeholder="Stock" />
              <input name="image" type="url" placeholder="Image URL" />
              <button type="submit">Add product</button>
            </form>
            <table style={{ width: "100%", marginTop: 16, background: "white", borderCollapse: "collapse" }}>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>{product.name}</td><td>{product.category}</td><td>${product.price.toFixed(2)}</td><td>{product.stock}</td><td>{product.active ? "Active" : "Hidden"}</td>
                    <td>
                      <button onClick={() => void editProduct(product)}>Edit</button>{" "}
                      <button onClick={() => void removeProduct(product._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!products.length && <p>No products yet.</p>}
          </>
        )}
        {section === "Orders" && (
          <>
            <table style={{ width: "100%", marginTop: 16, background: "white", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const nextStatuses = allowedOrderTransitions(order.status);
                  const nextStatus = nextStatuses.find((status) => status !== "cancelled");
                  return (
                    <tr key={order.id}>
                      <td><strong>{order.number}</strong></td>
                      <td>{order.customer.name}<br /><small>{order.customer.email}</small></td>
                      <td>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td>
                      <td>{new Intl.NumberFormat(undefined, { style: "currency", currency: order.currency }).format(order.totals.totalMinor / 100)}</td>
                      <td>{order.status}</td>
                      <td>
                        {nextStatus && (
                          <button type="button" onClick={() => void updateOrderStatus(order, nextStatus)}>
                            Mark {nextStatus}
                          </button>
                        )}
                        {nextStatuses.includes("cancelled") && (
                          <button type="button" onClick={() => void updateOrderStatus(order, "cancelled")}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!orders.length && <p>No orders yet.</p>}
          </>
        )}
      </div>
    </main>
  );
}
