const MAX_MESSAGE = 4000;
const MAX_EMAIL = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactPayload = {
  message: string;
  replyEmail?: string;
  source?: string;
  pageUrl?: string;
};

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export function parseContactPayload(raw: unknown): ContactPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE) return null;

  const replyEmail =
    typeof body.replyEmail === "string" ? body.replyEmail.trim() : "";
  if (replyEmail && (replyEmail.length > MAX_EMAIL || !EMAIL_RE.test(replyEmail))) {
    return null;
  }

  const source =
    typeof body.source === "string" ? body.source.trim().slice(0, 120) : "";
  const pageUrl =
    typeof body.pageUrl === "string" ? body.pageUrl.trim().slice(0, 500) : "";

  return {
    message,
    replyEmail: replyEmail || undefined,
    source: source || undefined,
    pageUrl: pageUrl || undefined,
  };
}

/**
 * Web3Forms gratuit = envoi depuis le navigateur uniquement.
 * (L’appel serveur exige un plan payant + IP whitelist.)
 * La access key est publique par design.
 */
export function getWeb3FormsAccessKey() {
  return (
    process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim() ||
    process.env.WEB3FORMS_ACCESS_KEY?.trim() ||
    ""
  );
}

export async function sendContactEmail(
  payload: ContactPayload,
): Promise<ContactResult> {
  const accessKey = getWeb3FormsAccessKey();
  if (!accessKey) {
    return {
      ok: false,
      status: 503,
      error:
        "Envoi non configuré : ajoute NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY dans .env.local, puis redémarre le serveur.",
    };
  }

  const source = payload.source ?? "Contact";
  const subject = `Retour : ${source}`;
  const metaLines = [
    `Source : ${source}`,
    payload.pageUrl ? `Page : ${payload.pageUrl}` : null,
  ].filter(Boolean);

  const body: Record<string, string | boolean> = {
    access_key: accessKey,
    subject,
    from_name: "Mehdi Design — Retours jeux",
    name: source,
    message: `${payload.message}\n\n---\n${metaLines.join("\n")}`,
    botcheck: false,
  };
  if (payload.replyEmail) {
    body.email = payload.replyEmail;
    body.replyto = payload.replyEmail;
  }

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;

    if (!response.ok || !data?.success) {
      console.error("[contact]", data?.message ?? response.status);
      return {
        ok: false,
        status: 502,
        error:
          typeof data?.message === "string" && data.message
            ? data.message
            : "Impossible d’envoyer le message pour le moment.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("[contact]", error);
    return {
      ok: false,
      status: 502,
      error: "Impossible d’envoyer le message pour le moment.",
    };
  }
}
