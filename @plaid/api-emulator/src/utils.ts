export function requestId(): string {
  return `plaid-${Math.random().toString(36).slice(2, 10)}`;
}

export function token(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function today(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function isoOffset(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length ? value : fallback;
}

export function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.map(String) : fallback;
}
