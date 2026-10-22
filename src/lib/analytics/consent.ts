export type ConsentStatus = "granted" | "denied" | null;

export const CONSENT_STORAGE_KEY = "analytics_consent";
export const CONSENT_COOKIE_NAME = "analytics_consent";
export const CONSENT_EVENT = "analytics-consent";

export function getConsent(): ConsentStatus {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    // ignore
  }
  return null;
}

export function setConsent(status: "granted" | "denied") {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // ignore
  }
  document.cookie = `${CONSENT_COOKIE_NAME}=${status};path=/;max-age=31536000;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: status }));
}

export function subscribeConsent(
  listener: (status: ConsentStatus) => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<"granted" | "denied">).detail;
    listener(detail);
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
