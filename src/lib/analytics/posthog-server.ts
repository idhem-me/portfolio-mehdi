import "server-only";
export type AnalyticsPeriod = 7 | 30;

export type AnalyticsSummary = {
  periodDays: AnalyticsPeriod;
  visitors: number;
  pageviews: number;
  topPages: { path: string; views: number }[];
  topEvents: { event: string; count: number }[];
  posthogAppUrl: string | null;
  clarityAppUrl: string | null;
  vercelAppUrl: string | null;
  configured: boolean;
  error?: string;
};

function getApiHost() {
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ||
    "https://eu.i.posthog.com";
  // Client ingest host often uses *.i.posthog.com; API uses app host without .i
  if (host.includes(".i.posthog.com")) {
    return host.replace(".i.posthog.com", ".posthog.com");
  }
  return host;
}

async function runHogQL(query: string): Promise<unknown[][]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new Error("PostHog server credentials missing");
  }

  const res = await fetch(`${getApiHost()}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query,
      },
    }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error("Analytics provider unavailable");
  }

  const json = (await res.json()) as { results?: unknown[][] };
  return json.results ?? [];
}

export async function fetchAnalyticsSummary(
  periodDays: AnalyticsPeriod = 7,
): Promise<AnalyticsSummary> {
  const posthogAppUrl = process.env.NEXT_PUBLIC_POSTHOG_APP_URL?.trim() || null;
  const clarityAppUrl = process.env.NEXT_PUBLIC_CLARITY_APP_URL?.trim() || null;
  const vercelAppUrl =
    process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_URL?.trim() || null;

  const hasServer =
    Boolean(process.env.POSTHOG_PERSONAL_API_KEY) &&
    Boolean(process.env.POSTHOG_PROJECT_ID);

  const base: AnalyticsSummary = {
    periodDays,
    visitors: 0,
    pageviews: 0,
    topPages: [],
    topEvents: [],
    posthogAppUrl,
    clarityAppUrl,
    vercelAppUrl,
    configured: hasServer,
  };

  if (!hasServer) {
    return {
      ...base,
      error:
        "Configurez POSTHOG_PERSONAL_API_KEY et POSTHOG_PROJECT_ID pour afficher les KPI.",
    };
  }

  try {
    const [visitorsRows, pageviewsRows, topPagesRows, topEventsRows] =
      await Promise.all([
        runHogQL(`
          SELECT count(DISTINCT distinct_id) AS visitors
          FROM events
          WHERE timestamp > now() - INTERVAL ${periodDays} DAY
        `),
        runHogQL(`
          SELECT count() AS pageviews
          FROM events
          WHERE event = '$pageview'
            AND timestamp > now() - INTERVAL ${periodDays} DAY
        `),
        runHogQL(`
          SELECT
            properties.$pathname AS path,
            count() AS views
          FROM events
          WHERE event = '$pageview'
            AND timestamp > now() - INTERVAL ${periodDays} DAY
            AND properties.$pathname IS NOT NULL
          GROUP BY path
          ORDER BY views DESC
          LIMIT 8
        `),
        runHogQL(`
          SELECT
            event,
            count() AS count
          FROM events
          WHERE timestamp > now() - INTERVAL ${periodDays} DAY
            AND event NOT LIKE '$%'
          GROUP BY event
          ORDER BY count DESC
          LIMIT 8
        `),
      ]);

    return {
      ...base,
      visitors: Number(visitorsRows[0]?.[0] ?? 0),
      pageviews: Number(pageviewsRows[0]?.[0] ?? 0),
      topPages: topPagesRows.map((row) => ({
        path: String(row[0] ?? "/"),
        views: Number(row[1] ?? 0),
      })),
      topEvents: topEventsRows.map((row) => ({
        event: String(row[0] ?? ""),
        count: Number(row[1] ?? 0),
      })),
    };
  } catch {
    return {
      ...base,
      error: "Les statistiques sont momentanément indisponibles.",
    };
  }
}
