const CHECKOUT_ENTRY_KEY = "tangerine-checkout-entry";

export function allowCheckoutEntry() {
  try {
    sessionStorage.setItem(CHECKOUT_ENTRY_KEY, "1");
  } catch {}
}

export function consumeCheckoutEntry() {
  try {
    const allowed = sessionStorage.getItem(CHECKOUT_ENTRY_KEY) === "1";
    sessionStorage.removeItem(CHECKOUT_ENTRY_KEY);
    return allowed;
  } catch {
    return false;
  }
}
