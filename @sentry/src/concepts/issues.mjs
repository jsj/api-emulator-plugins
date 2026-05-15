import { now } from '../store.mjs';

export function makeIssue(state, overrides = {}) {
  const id = String(overrides.id ?? state.nextIssueId++);
  const title = overrides.title ?? 'Fatal error: Portfolio view crashed';
  return {
    id,
    shortId: overrides.shortId ?? `VIBETRADE-${id}`,
    title,
    culprit: overrides.culprit ?? 'PortfolioBreakdown.render',
    permalink: overrides.permalink ?? `https://sentry.local/organizations/vibetrade/issues/${id}/`,
    level: overrides.level ?? 'error',
    platform: overrides.platform ?? 'swift',
    project: overrides.project ?? { slug: 'vibetrade-ios' },
    metadata: {
      type: overrides.metadata?.type ?? 'NSInvalidArgumentException',
      value: overrides.metadata?.value ?? title,
      filename: overrides.metadata?.filename ?? 'PortfolioBreakdown.swift',
      function: overrides.metadata?.function ?? 'render',
      ...overrides.metadata,
    },
    firstSeen: overrides.firstSeen ?? now(),
    lastSeen: overrides.lastSeen ?? now(),
  };
}

export function issueWebhookPayload(issue, action = 'created') {
  return {
    action,
    installation: { uuid: 'sentry-emulator-installation' },
    actor: { type: 'application', id: 'sentry-emulator', name: 'Sentry Emulator' },
    data: { issue },
  };
}
