export function paginate<T>(items: T[], page = 1, pageSize = 10) {
  const safeSize = Math.max(1, pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return { data: items.slice((safePage - 1) * safeSize, safePage * safeSize), total, page: safePage, pageSize: safeSize, totalPages };
}

export function normalizedIncludes(haystack: string, needle?: string): boolean {
  return !needle || haystack.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase());
}

export function parseDisplayDate(value: string): number {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getTime();
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  return match ? new Date(`${match[2]} ${match[1]}, ${match[3]}`).getTime() || 0 : 0;
}

export function nextReference(prefix: string, values: string[], width = 6): string {
  const max = values.reduce((highest, value) => {
    const n = Number(value.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(highest, n);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

export function dateWithinRange(value: string, range?: string): boolean {
  if (!range || range === "All") return true;
  const date = parseDisplayDate(value);
  if (!date) return true;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "This year") start.setMonth(0, 1);
  else if (range === "Last 30 days") start.setDate(start.getDate() - 30);
  else if (range === "Last 90 days") start.setDate(start.getDate() - 90);
  return date >= start.getTime() && date <= now.getTime() + 366 * 24 * 60 * 60 * 1000;
}
