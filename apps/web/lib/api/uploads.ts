export function resolveUploadedPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith("/api/proxy/")) return url;
  if (url.startsWith("/uploads/")) return `/api/proxy${url}`;
  if (url.startsWith("uploads/")) return `/api/proxy/${url}`;
  return url;
}
