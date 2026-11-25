"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";

type CartLine = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
};

type CheckoutFields = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

const initialFields: CheckoutFields = {
  name: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

const steps = ["Contact", "Delivery", "Payment", "Review"];
const errorMessages: Record<string, string> = {
  OUT_OF_STOCK: "One or more items no longer have enough stock. Update your cart and try again.",
  PRODUCT_UNAVAILABLE: "One or more products are no longer available.",
  STORE_UNAVAILABLE: "This store is currently unavailable.",
  RATE_LIMITED: "Too many checkout attempts. Please wait a moment and try again.",
  IDEMPOTENCY_KEY_REUSED: "Your checkout changed during submission. Please place the order again.",
  CUSTOMER_EMAIL_MISMATCH: "Use the email address linked to your signed-in account.",
};

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line._id === "string" &&
    typeof line.name === "string" &&
    typeof line.price === "number" &&
    Number.isFinite(line.price) &&
    Number.isInteger(line.quantity) &&
    Number(line.quantity) > 0
  );
}

function subscribeToCart(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("cartchange", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("cartchange", callback);
  };
}

function getCartSnapshot(key: string) {
  return window.localStorage.getItem(key) ?? "[]";
}

export default function CheckoutForm({
  tenantName,
  tenantSlug,
  currency,
}: {
  tenantName: string;
  tenantSlug: string;
  currency: string;
}) {
  const cartKey = `cart:${tenantSlug}`;
  const rawCart = useSyncExternalStore(
    subscribeToCart,
    () => getCartSnapshot(cartKey),
    () => "[]",
  );
  const cart = useMemo(() => {
    try {
      const saved = JSON.parse(rawCart) as unknown;
      return Array.isArray(saved) ? saved.filter(isCartLine) : [];
    } catch {
      return [];
    }
  }, [rawCart]);
  const [fields, setFields] = useState(initialFields);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cartWarning, setCartWarning] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{
    number: string;
    totalMinor: number;
  } | null>(null);
  const requestKey = useRef("");
  const requestBody = useRef("");

  const subtotal = cart.reduce(
    (sum, line) => sum + Math.round(line.price * 100) * line.quantity,
    0,
  );

  function updateField(field: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function continueToNextStep() {
    const requiredFields: (keyof CheckoutFields)[] =
      step === 0
        ? ["name", "email"]
        : step === 1
          ? ["line1", "city", "postalCode", "country"]
          : [];
    if (requiredFields.some((field) => !fields[field].trim())) {
      setError("Complete the required fields before continuing.");
      return;
    }
    if (
      step === 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
    ) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setStep((current) => current + 1);
  }

  async function placeOrder() {
    setError("");
    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    const body = JSON.stringify({
      items: cart.map((line) => ({
        productId: line._id,
        quantity: line.quantity,
      })),
      customer: {
        name: fields.name,
        email: fields.email,
        phone: fields.phone,
      },
      address: {
        line1: fields.line1,
        line2: fields.line2,
        city: fields.city,
        region: fields.region,
        postalCode: fields.postalCode,
        country: fields.country,
      },
      paymentMethod: "cash_on_delivery",
    });
    if (requestBody.current !== body) {
      requestBody.current = body;
      requestKey.current = crypto.randomUUID();
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/store/${tenantSlug}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current,
        },
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          errorMessages[result.error] ??
            "We could not place the order. Please try again.",
        );
        return;
      }

      setPlacedOrder({
        number: result.order.number,
        totalMinor: result.order.totals.totalMinor,
      });
      try {
        window.localStorage.removeItem(cartKey);
        window.dispatchEvent(new Event("cartchange"));
      } catch {
        setCartWarning("Your order is placed, but this browser could not clear the saved cart.");
      }
    } catch {
      setError(
        "We could not confirm the response. Retry this checkout safely; duplicate orders are prevented.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function submitCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      continueToNextStep();
    } else {
      void placeOrder();
    }
  }

  if (placedOrder) {
    return (
      <section className="checkout-success" aria-live="polite">
        <p className="eyebrow">Order received</p>
        <h1>Thank you, {fields.name}.</h1>
        <p>
          Your order <strong>{placedOrder.number}</strong> has been placed with
          cash on delivery.
        </p>
        <p>
          Total:{" "}
          <strong>
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency,
            }).format(placedOrder.totalMinor / 100)}
          </strong>
        </p>
        {cartWarning && <p role="status">{cartWarning}</p>}
        <Link className="primary-button" href={`/store/${tenantSlug}`}>
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="checkout-card" onSubmit={submitCheckout}>
        <Link href={`/store/${tenantSlug}`} className="checkout-back">
          ← {tenantName}
        </Link>
        <h1>Checkout</h1>
        <ol className="checkout-steps" aria-label="Checkout progress">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={index <= step ? "current" : ""}
            >
              <span>{index + 1}</span> {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <fieldset className="checkout-fields">
            <legend>Contact details</legend>
            <label>
              Full name
              <input
                autoComplete="name"
                required
                value={fields.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                autoComplete="email"
                type="email"
                required
                value={fields.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>
            <label>
              Phone (optional)
              <input
                autoComplete="tel"
                value={fields.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>
            <Link href={`/account?store=${encodeURIComponent(tenantSlug)}`}>
              Already have an account? Sign in
            </Link>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="checkout-fields">
            <legend>Delivery address</legend>
            <label>
              Address
              <input
                autoComplete="address-line1"
                required
                value={fields.line1}
                onChange={(event) => updateField("line1", event.target.value)}
              />
            </label>
            <label>
              Apartment, suite, etc. (optional)
              <input
                autoComplete="address-line2"
                value={fields.line2}
                onChange={(event) => updateField("line2", event.target.value)}
              />
            </label>
            <div className="checkout-field-row">
              <label>
                City
                <input
                  autoComplete="address-level2"
                  required
                  value={fields.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />
              </label>
              <label>
                State / region
                <input
                  autoComplete="address-level1"
                  value={fields.region}
                  onChange={(event) => updateField("region", event.target.value)}
                />
              </label>
            </div>
            <div className="checkout-field-row">
              <label>
                Postal code
                <input
                  autoComplete="postal-code"
                  required
                  value={fields.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
              </label>
              <label>
                Country
                <input
                  autoComplete="country-name"
                  required
                  value={fields.country}
                  onChange={(event) => updateField("country", event.target.value)}
                />
              </label>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="checkout-fields">
            <legend>Payment method</legend>
            <label className="checkout-payment">
              <input
                type="radio"
                name="payment"
                value="cash_on_delivery"
                checked
                readOnly
              />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay when your order arrives. No card details are collected.</small>
              </span>
            </label>
          </fieldset>
        )}

        {step === 3 && (
          <section className="checkout-review">
            <h2>Review your order</h2>
            <p>
              {fields.name} · {fields.email}
            </p>
            <p>
              {fields.line1}, {fields.city}, {fields.country}
            </p>
            <p>Payment: cash on delivery</p>
            <p>Items: {cart.reduce((sum, line) => sum + line.quantity, 0)}</p>
            <p className="checkout-review-total">
              Items subtotal:{" "}
              <strong>
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency,
                }).format(subtotal / 100)}
              </strong>
            </p>
            <small>
              Final prices and stock are verified securely when you place the
              order.
            </small>
          </section>
        )}

        {error && (
          <p className="checkout-error" role="alert">
            {error}
          </p>
        )}
        <div className="checkout-actions">
          {step > 0 && (
            <button type="button" onClick={() => setStep((current) => current - 1)}>
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              type="submit"
              className="checkout-primary"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="checkout-primary"
              disabled={submitting || !cart.length}
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          )}
        </div>
      </form>

      <aside className="checkout-card checkout-summary">
        <h2>Order summary</h2>
        {cart.map((line) => (
          <div className="checkout-summary-line" key={line._id}>
            <span>
              {line.name} × {line.quantity}
            </span>
            <strong>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
              }).format((Math.round(line.price * 100) * line.quantity) / 100)}
            </strong>
          </div>
        ))}
        {!cart.length && <p>Your cart is empty.</p>}
        <div className="checkout-summary-total">
          <span>Items subtotal</span>
          <strong>
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency,
            }).format(subtotal / 100)}
          </strong>
        </div>
      </aside>
    </div>
  );
}
