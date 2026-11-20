export type ConsentStatus = "granted" | "denied" | null;

export const CONSENT_STORAGE_KEY = "analytics_consent";
export const CONSENT_COOKIE_NAME = "analytics_consent";
export const CONSENT_EVENT = "analytics-consent";
const REPLAY_CONSENT_KEY = "clarity_replay_consent_v1";

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

export function hasReplayConsent() {
  try {
    return typeof window !== "undefined" &&
      localStorage.getItem(REPLAY_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function setConsent(status: "granted" | "denied", allowReplay?: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
    if (status === "denied" || allowReplay === false) {
      localStorage.removeItem(REPLAY_CONSENT_KEY);
    } else if (allowReplay === true) {
      localStorage.setItem(REPLAY_CONSENT_KEY, "granted");
    }
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
  const storage = () => listener(getConsent());
  window.addEventListener("storage", storage);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handler);
    window.removeEventListener("storage", storage);
  };
}

export function openAnalyticsPreferences() {
  window.dispatchEvent(new Event("analytics-preferences"));
}
