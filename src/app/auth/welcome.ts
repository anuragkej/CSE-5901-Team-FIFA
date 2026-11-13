export function welcomeName(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (trimmed.length === 0 || trimmed.length > 80) return null;
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (!/^[A-Za-z][A-Za-z'-]{0,39}$/.test(first)) return null;
  return first;
}

export function verifyHref(email: string, name: string): string {
  const params = new URLSearchParams({ email });
  const first = welcomeName(name);
  if (first) params.set("name", first);
  return `/verify?${params.toString()}`;
}
