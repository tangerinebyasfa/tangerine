const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const SCRIPT_ID = "razorpay-checkout-js";

let scriptPromise = null;

// The public key id is safe to ship to the browser. NEXT_PUBLIC_RAZORPAY_KEY_ID
// is the single source of truth; the order API echoes the same value as a
// fallback so a checkout still opens if the frontend env var is missing.
export function razorpayKeyId(fallback) {
  return (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || fallback || "").trim();
}

// Loads Checkout.js once per page and resolves when it is safe to call new Razorpay().
export function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("Payments are only available in the browser."));

  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => {
        scriptPromise = null;
        reject(new Error("Could not load the secure payment window."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else {
        scriptPromise = null;
        reject(new Error("The secure payment window did not initialise. Please retry."));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the secure payment window. Check your connection and retry."));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}
