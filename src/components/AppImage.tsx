import React, { useEffect, useMemo, useState } from 'react';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  idKey?: string; // The ID of the item or machine, maps to /images/{idKey}.png
  fallbackUrl?: string; // The URL to use if the local image is missing
  secondaryFallbackUrl?: string; // Optional second fallback source
}

function normalizeImageSource(url: string): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  if (url.includes('raw.githubusercontent.com')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=128&output=webp&maxage=30d`;
}

export function AppImage({ idKey, fallbackUrl, secondaryFallbackUrl, alt, className, ...props }: AppImageProps) {
  const localSrc = idKey ? `/images/${idKey}.png` : '';
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (localSrc) list.push(localSrc);
    if (fallbackUrl) list.push(normalizeImageSource(fallbackUrl));
    if (secondaryFallbackUrl) list.push(normalizeImageSource(secondaryFallbackUrl));
    return list;
  }, [localSrc, fallbackUrl, secondaryFallbackUrl]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [localSrc, fallbackUrl, secondaryFallbackUrl]);

  if (!candidates[sourceIndex]) {
    return <div className={`flex items-center justify-center text-[10px] text-gray-500 overflow-hidden bg-black/20 ${className || ''}`} title={alt}>{alt?.substring(0, 2)}</div>;
  }

  return (
    <img 
      src={candidates[sourceIndex]}
      alt={alt} 
      onError={() => setSourceIndex((prev) => prev + 1)}
      crossOrigin="anonymous"
      loading="lazy" 
      className={className}
      {...props} 
    />
  );
}
