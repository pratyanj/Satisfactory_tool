import React, { useEffect, useMemo, useState } from 'react';
import { buildImageCandidates } from '../utils/imageSource';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  idKey?: string; // The ID of the item or machine, maps to /images/{idKey}.png
  fallbackUrl?: string; // The URL to use if the local image is missing
  secondaryFallbackUrl?: string; // Optional second fallback source
}

export function AppImage({ idKey, fallbackUrl, secondaryFallbackUrl, alt, className, ...props }: AppImageProps) {
  const candidates = useMemo(
    () => buildImageCandidates(idKey, fallbackUrl, secondaryFallbackUrl),
    [idKey, fallbackUrl, secondaryFallbackUrl]
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [idKey, fallbackUrl, secondaryFallbackUrl]);

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
