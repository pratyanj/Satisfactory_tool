/**
 * Shared image-source resolution.
 *
 * Single source of truth for how the app turns an entity id / remote URL into a
 * prioritized list of candidate image sources. Used by both the DOM <img>
 * renderer (AppImage) and the SVG <image> renderer (MachineSvgImage) so the
 * local-first → remote-fallback behavior stays identical everywhere.
 */

/** Local public asset path for a given entity id (item or machine). */
export function localImagePath(idKey: string): string {
  return `/images/${idKey}.png`;
}

/**
 * Normalize a remote image URL. Local and GitHub-raw URLs are used as-is;
 * everything else is routed through the wsrv.nl image proxy (resized/cached).
 */
export function normalizeImageSource(url: string): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  if (url.includes('raw.githubusercontent.com')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=128&output=webp&maxage=30d`;
}

/**
 * Build the ordered list of candidate sources to try for an image:
 * local asset first, then the provided fallback URL(s).
 */
export function buildImageCandidates(
  idKey?: string,
  fallbackUrl?: string,
  secondaryFallbackUrl?: string
): string[] {
  const list: string[] = [];
  if (idKey) list.push(localImagePath(idKey));
  if (fallbackUrl) list.push(normalizeImageSource(fallbackUrl));
  if (secondaryFallbackUrl) list.push(normalizeImageSource(secondaryFallbackUrl));
  return list;
}
