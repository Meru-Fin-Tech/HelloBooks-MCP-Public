export function countBy<T>(arr: T[], keyFn: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function csvError(message: string) {
  return {
    status: 'error' as const,
    error: 'empty_or_invalid_csv',
    message,
  };
}
