import type { RouteContext, Store } from "@emulators/core";

interface AnalyticsSnapshot {
  authenticated: boolean;
  app_id: string;
  reports: Array<{ category: string; name: string; request_id: string }>;
  metrics: {
    available: boolean;
    metric_count: number;
    advanced_metrics: Array<{
      key: string;
      label: string;
      value: number;
      p25: number | null;
      p50: number | null;
      p75: number | null;
    }>;
  };
}

function getSnapshot(store: Store): AnalyticsSnapshot | null {
  return store.getData<AnalyticsSnapshot>("asc.analytics_snapshot") ?? null;
}

export function analyticsRoutes({ app, store, baseUrl }: RouteContext): void {
  // Analytics doctor/snapshot
  app.get("/v1/analyticsReportRequests", (c) => {
    const snapshot = getSnapshot(store);
    if (!snapshot) {
      return c.json({ data: [], links: { self: `${baseUrl}/v1/analyticsReportRequests` }, meta: { paging: { total: 0, limit: 50 } } });
    }

    return c.json({
      data: snapshot.reports.map((r) => ({
        type: "analyticsReportRequests",
        id: r.request_id,
        attributes: { category: r.category, name: r.name },
      })),
      links: { self: `${baseUrl}/v1/analyticsReportRequests` },
      meta: { paging: { total: snapshot.reports.length, limit: 50 } },
    });
  });

  // App metrics
  app.get("/v1/apps/:appId/perfPowerMetrics", (c) => {
    const snapshot = getSnapshot(store);
    if (!snapshot?.metrics) {
      return c.json({ data: [] });
    }

    return c.json({
      data: snapshot.metrics.advanced_metrics.map((m) => ({
        type: "perfPowerMetrics",
        id: m.key,
        attributes: {
          metricType: m.key,
          label: m.label,
          value: m.value,
          percentiles: { p25: m.p25, p50: m.p50, p75: m.p75 },
        },
      })),
    });
  });
}
