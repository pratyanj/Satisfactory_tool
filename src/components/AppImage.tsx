import React, { useState } from 'react';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  idKey?: string; // The ID of the item or machine, maps to /images/{idKey}.png
  fallbackUrl?: string; // The URL to use if the local image is missing
}

export function AppImage({ idKey, fallbackUrl, alt, className, ...props }: AppImageProps) {
  const [error, setError] = useState(false);
  
  const localSrc = idKey ? `/images/${idKey}.png` : '';
  const wsrvUrl = fallbackUrl ? `https://wsrv.nl/?url=${encodeURIComponent(fallbackUrl)}&w=128&output=webp&maxage=30d` : '';

  // If we've already errored trying the first source, and we have a fallback
  if (error && wsrvUrl) {
    return <img src={wsrvUrl} alt={alt} crossOrigin="anonymous" loading="lazy" className={className} {...props} />;
  } else if (error) {
    // If it failed and no fallback is available
    return <div className={`flex items-center justify-center text-[10px] text-gray-500 overflow-hidden bg-black/20 ${className || ''}`} title={alt}>{alt?.substring(0, 2)}</div>;
  }

  // Try the local source first (if idKey was provided), otherwise jump straight to the remote URL
  return (
    <img 
      src={localSrc || wsrvUrl} 
      alt={alt} 
      onError={() => setError(true)} 
      loading="lazy" 
      className={className}
      {...props} 
    />
  );
}
