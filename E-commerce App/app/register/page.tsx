"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/register-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: data.get("storeName"),
        slug: data.get("slug"),
        ownerName: data.get("ownerName"),
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Registration failed");
      return;
    }
    router.push("/admin");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f7fb" }}>
      <form onSubmit={submit} style={{ width: "min(430px, calc(100% - 32px))", display: "grid", gap: 12, background: "white", padding: 32, borderRadius: 16 }}>
        <Link href="/">← Back</Link>
        <h1>Create your store</h1>
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
        <input name="storeName" required minLength={2} placeholder="Store name" />
        <input name="slug" required pattern="[a-z0-9-]{2,63}" placeholder="unique-store-slug" />
        <input name="ownerName" required minLength={2} placeholder="Owner name" />
        <input name="email" type="email" required placeholder="Owner email" />
        <input name="password" type="password" required minLength={12} placeholder="Password (12+ characters)" />
        <button type="submit">Create store</button>
      </form>
    </main>
  );
}
