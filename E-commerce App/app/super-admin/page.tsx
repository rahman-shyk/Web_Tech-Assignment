"use client";

import { FormEvent, useEffect, useState } from "react";

type TenantStatus = "pending" | "active" | "suspended" | "archived";
type FeatureKey = "storefront" | "catalog" | "orders";

type Tenant = {
  _id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  planId: string;
  status: TenantStatus;
};

type Feature = {
  key: FeatureKey;
  name: string;
  description: string;
  enabled: boolean;
  version: number;
};

type Plan = {
  _id: string;
  name: string;
  description: string;
  enabled: boolean;
  features: Partial<Record<FeatureKey, number>>;
  version: number;
};

type CatalogResponse = { plans: Plan[]; features: Feature[] };

const featureKeys: FeatureKey[] = ["storefront", "catalog", "orders"];
const panelStyle = {
  background: "white",
  border: "1px solid #e3e7ed",
  borderRadius: 12,
  padding: 20,
};
const inputStyle = {
  minHeight: 40,
  border: "1px solid #d5dbe4",
  borderRadius: 7,
  padding: "8px 10px",
};
const buttonStyle = {
  minHeight: 38,
  border: "1px solid #d5dbe4",
  borderRadius: 7,
  padding: "8px 12px",
  background: "white",
  cursor: "pointer",
};

export default function SuperAdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tab, setTab] = useState<"Tenants" | "Plans" | "Features">("Tenants");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const [tenantResponse, catalogResponse] = await Promise.all([
          fetch("/api/platform/tenants"),
          fetch("/api/platform/plans"),
        ]);
        if (!active || tenantResponse.status === 401) return;
        if (!tenantResponse.ok || !catalogResponse.ok) {
          setError("Could not verify the platform session.");
          return;
        }
        const [tenantPayload, catalogPayload]: [
          { tenants?: Tenant[] },
          CatalogResponse,
        ] = await Promise.all([tenantResponse.json(), catalogResponse.json()]);
        if (!active) return;
        setTenants(tenantPayload.tenants ?? []);
        setPlans(catalogPayload.plans);
        setFeatures(catalogPayload.features);
        setLoggedIn(true);
      } catch {
        if (active) setError("Could not connect to the platform service.");
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/platform/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Login failed.");
        return;
      }
      setLoggedIn(true);
      await Promise.all([load(), loadCatalog()]);
    } catch {
      setError("Could not connect to the platform service.");
    }
  }

  async function load(search = query) {
    setError("");
    try {
      const response = await fetch(
        `/api/platform/tenants?q=${encodeURIComponent(search)}`,
      );
      if (response.status === 401) {
        setLoggedIn(false);
        return;
      }
      if (!response.ok) {
        setError("Could not load tenants.");
        return;
      }
      const payload = await response.json();
      setTenants(payload.tenants ?? []);
    } catch {
      setError("Could not connect to the platform service.");
    }
  }

  async function loadCatalog() {
    try {
      const response = await fetch("/api/platform/plans");
      if (response.status === 401) {
        setLoggedIn(false);
        return;
      }
      if (!response.ok) {
        setError("Could not load plans and features.");
        return;
      }
      const payload: CatalogResponse = await response.json();
      setPlans(payload.plans);
      setFeatures(payload.features);
    } catch {
      setError("Could not connect to the platform service.");
    }
  }

  async function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          slug: data.get("slug"),
          ownerEmail: data.get("ownerEmail"),
          planId: data.get("planId"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not create tenant.");
        return;
      }
      form.reset();
      setNotice("Tenant created and provisioned.");
      await load();
    } catch {
      setError("Could not connect to the platform service.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(tenantId: string, status: TenantStatus) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not update tenant status.");
        return;
      }
      await load();
    } catch {
      setError("Could not connect to the platform service.");
    }
  }

  async function assignPlan(tenantId: string, planId: string) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not assign plan.");
        await load();
        return;
      }
      setNotice("Tenant plan updated.");
      await load();
    } catch {
      setError("Could not connect to the platform service.");
    }
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/platform/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.get("id"),
          name: data.get("name"),
          description: data.get("description"),
          featureKeys: data.getAll("featureKeys"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not create plan.");
        return;
      }
      form.reset();
      setNotice("Plan created.");
      await loadCatalog();
    } catch {
      setError("Could not connect to the platform service.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePlan(event: FormEvent<HTMLFormElement>, plan: Plan) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const featureValues = data.getAll("featureKeys");
    const selectedFeatures = featureValues.filter(
      (value): value is FeatureKey =>
        typeof value === "string" && featureKeys.includes(value as FeatureKey),
    );
    try {
      const response = await fetch(`/api/platform/plans/${plan._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          description: data.get("description"),
          enabled: data.get("enabled") === "on",
          featureKeys: selectedFeatures,
          version: plan.version,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not update plan.");
        await loadCatalog();
        return;
      }
      setNotice("Plan updated.");
      await loadCatalog();
    } catch {
      setError("Could not connect to the platform service.");
    } finally {
      setBusy(false);
    }
  }

  async function setFeatureEnabled(feature: Feature) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/platform/features/${feature.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !feature.enabled }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Could not update feature availability.");
        return;
      }
      setNotice(`${feature.name} ${feature.enabled ? "disabled" : "enabled"}.`);
      await loadCatalog();
    } catch {
      setError("Could not connect to the platform service.");
    }
  }

  if (!loggedIn) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f7fb",
        }}
      >
        <form
          onSubmit={login}
          style={{ ...panelStyle, width: 360, display: "grid", gap: 12 }}
        >
          <h1>Platform login</h1>
          {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
          <input
            name="email"
            type="email"
            required
            placeholder="Admin email"
            style={inputStyle}
          />
          <input
            name="password"
            type="password"
            minLength={12}
            required
            placeholder="Password"
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        color: "#172033",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
        <header>
          <p style={{ margin: 0, color: "#667085" }}>Platform administration</p>
          <h1 style={{ margin: "6px 0 16px" }}>{tab}</h1>
          <nav aria-label="Platform sections" style={{ display: "flex", gap: 8 }}>
            {(["Tenants", "Plans", "Features"] as const).map((item) => (
              <button
                type="button"
                key={item}
                aria-current={tab === item ? "page" : undefined}
                onClick={() => setTab(item)}
                style={{
                  ...buttonStyle,
                  background: tab === item ? "#635bff" : "white",
                  color: tab === item ? "white" : "#172033",
                }}
              >
                {item}
              </button>
            ))}
          </nav>
        </header>

        {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
        {notice && <p role="status" style={{ color: "#147a4b" }}>{notice}</p>}

        {tab === "Tenants" && (
          <>
            <form
              onSubmit={createTenant}
              style={{
                ...panelStyle,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <input name="name" required minLength={2} placeholder="Store name" style={inputStyle} />
              <input
                name="slug"
                required
                pattern="[a-z0-9-]{2,63}"
                placeholder="unique-slug"
                style={inputStyle}
              />
              <input
                name="ownerEmail"
                type="email"
                required
                placeholder="Owner email"
                style={inputStyle}
              />
              <select name="planId" required style={inputStyle} defaultValue="starter">
                {plans.filter((plan) => plan.enabled).map((plan) => (
                  <option key={plan._id} value={plan._id}>{plan.name}</option>
                ))}
              </select>
              <button type="submit" disabled={busy} style={buttonStyle}>
                {busy ? "Creating..." : "Create tenant"}
              </button>
            </form>

            <input
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                void load(nextQuery);
              }}
              placeholder="Search tenants by name, slug, or owner email"
              aria-label="Search tenants"
              style={{ ...inputStyle, width: "100%" }}
            />

            <section style={{ ...panelStyle, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 10 }}>Store</th>
                    <th style={{ padding: 10 }}>Owner</th>
                    <th style={{ padding: 10 }}>Plan</th>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant._id}>
                      <td style={{ padding: 10 }}>
                        <strong>{tenant.name}</strong>
                        <div style={{ color: "#667085" }}>{tenant.slug}</div>
                      </td>
                      <td style={{ padding: 10 }}>{tenant.ownerEmail}</td>
                      <td style={{ padding: 10 }}>
                        <select
                          aria-label={`Plan for ${tenant.name}`}
                          value={tenant.planId}
                          onChange={(event) => void assignPlan(tenant._id, event.target.value)}
                          style={inputStyle}
                        >
                          {plans.map((plan) => (
                            <option key={plan._id} value={plan._id} disabled={!plan.enabled}>
                              {plan.name}{plan.enabled ? "" : " (disabled)"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 10 }}>{tenant.status}</td>
                      <td style={{ padding: 10, display: "flex", gap: 6 }}>
                        {tenant.status === "suspended" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(tenant._id, "active")}
                            style={buttonStyle}
                          >
                            Activate
                          </button>
                        )}
                        {tenant.status === "active" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(tenant._id, "suspended")}
                            style={buttonStyle}
                          >
                            Suspend
                          </button>
                        )}
                        {tenant.status !== "archived" && (
                          <button
                            type="button"
                            onClick={() => void setStatus(tenant._id, "archived")}
                            style={buttonStyle}
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!tenants.length && <p>No tenants found.</p>}
            </section>
          </>
        )}

        {tab === "Plans" && (
          <>
            <form
              onSubmit={createPlan}
              style={{ ...panelStyle, display: "grid", gap: 10 }}
            >
              <h2 style={{ margin: 0 }}>Create plan</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <input
                  name="id"
                  required
                  pattern="[a-z0-9][a-z0-9_-]{1,62}"
                  placeholder="plan-id"
                  style={inputStyle}
                />
                <input name="name" required minLength={2} placeholder="Plan name" style={inputStyle} />
                <input name="description" placeholder="Description" style={inputStyle} />
              </div>
              <FeatureCheckboxes features={features} name="featureKeys" />
              <button type="submit" disabled={busy} style={buttonStyle}>
                {busy ? "Saving..." : "Create plan"}
              </button>
            </form>
            <div style={{ display: "grid", gap: 12 }}>
              {plans.map((plan) => (
                <form
                  key={plan._id}
                  onSubmit={(event) => void updatePlan(event, plan)}
                  style={{ ...panelStyle, display: "grid", gap: 10 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{plan.name}</h2>
                      <small style={{ color: "#667085" }}>{plan._id} · revision {plan.version}</small>
                    </div>
                    <label>
                      <input name="enabled" type="checkbox" defaultChecked={plan.enabled} />
                      {" "}Enabled
                    </label>
                  </div>
                  <input name="name" required minLength={2} defaultValue={plan.name} style={inputStyle} />
                  <input name="description" defaultValue={plan.description} style={inputStyle} />
                  <FeatureCheckboxes
                    features={features}
                    name="featureKeys"
                    selected={plan.features}
                  />
                  <button type="submit" disabled={busy} style={buttonStyle}>Save plan</button>
                </form>
              ))}
            </div>
          </>
        )}

        {tab === "Features" && (
          <section style={{ display: "grid", gap: 12 }}>
            {features.map((feature) => (
              <article
                key={feature.key}
                style={{
                  ...panelStyle,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>{feature.name}</h2>
                  <p style={{ marginBottom: 0, color: "#667085" }}>{feature.description}</p>
                  <small>Feature version {feature.version}</small>
                </div>
                <button
                  type="button"
                  onClick={() => void setFeatureEnabled(feature)}
                  style={buttonStyle}
                >
                  {feature.enabled ? "Disable" : "Enable"}
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function FeatureCheckboxes({
  features,
  name,
  selected = {},
}: {
  features: Feature[];
  name: string;
  selected?: Partial<Record<FeatureKey, number>>;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 14 }}>
      <legend style={{ marginBottom: 8 }}>Included features</legend>
      {features.map((feature) => (
        <label key={feature.key}>
          <input
            type="checkbox"
            name={name}
            value={feature.key}
            defaultChecked={Boolean(selected[feature.key])}
          />
          {" "}{feature.name}
        </label>
      ))}
    </fieldset>
  );
}
