import React, { useEffect, useMemo, useState } from 'react';
import { buildImageCandidates } from '../../utils/imageSource';

interface MachineSvgImageProps {
  /** Machine id — resolves to /images/{machineId}.png (local-first). */
  machineId: string;
  /** Remote fallback URL (e.g. machines[machineId].imageUrl). */
  fallbackUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alt?: string;
}

/**
 * SVG equivalent of <AppImage> for use inside the sandbox <svg> canvas.
 * Tries the local asset first, then the remote fallback, mirroring AppImage's
 * candidate logic. Renders nothing once all candidates fail so callers can show
 * their own fallback (e.g. a text label).
 */
export function MachineSvgImage({ machineId, fallbackUrl, x, y, width, height, alt }: MachineSvgImageProps) {
  const candidates = useMemo(
    () => buildImageCandidates(machineId, fallbackUrl),
    [machineId, fallbackUrl]
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [machineId, fallbackUrl]);

  const src = candidates[sourceIndex];
  if (!src) return null;

  return (
    <image
      href={src}
      x={x}
      y={y}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      crossOrigin="anonymous"
      onError={() => setSourceIndex((prev) => prev + 1)}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <title>{alt}</title>
    </image>
  );
}
