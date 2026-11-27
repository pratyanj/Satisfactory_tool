import React from 'react';
import { BookOpen, Hammer, Zap } from 'lucide-react';
import { AppImage } from './AppImage';

export interface CodexPlateCardProps {
  idKey: string;
  fallbackUrl?: string;
  title: string;
  category: string;
  /** Highlighted top-right amber badge (e.g. recipe count > 1 or power draw). */
  cornerBadge?: string | number | null;
  /** Compact metadata label displayed on the bottom-right (e.g. "2 recipes"). */
  footerMeta?: string;
  footerIcon?: 'recipe' | 'power' | 'build';
  onClick: () => void;
}

/**
 * Industrial Hardware Plate card (Design 4) shared across ItemBrowser and BuildingBrowser.
 */
export function CodexPlateCard({
  idKey,
  fallbackUrl,
  title,
  category,
  cornerBadge,
  footerMeta,
  footerIcon = 'recipe',
  onClick,
}: CodexPlateCardProps) {
  const FooterGlyph =
    footerIcon === 'power' ? Zap : footerIcon === 'build' ? Hammer : BookOpen;

  return (
    <button type="button" className="ib-plate-card" onClick={onClick} title={title}>
      {/* Top gunmetal strip: hazard accent + category + corner badge */}
      <div className="ib-plate-head">
        <div className="ib-plate-head-left">
          <svg
            className="ib-plate-hazard-svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
          >
            <rect width="14" height="14" rx="2" fill="#0d1016" />
            <path d="M1 10 L7 2 H10.5 L4.5 12 H1 Z" fill="#f48721" />
            <path d="M7.5 12 L13 4.5 V8 L10 12 Z" fill="#f48721" />
            <path d="M1 5.5 L3.5 2 H1 Z" fill="#f48721" />
          </svg>
          <span className="ib-plate-cat">{category}</span>
        </div>
        {cornerBadge != null && (
          <span className="ib-plate-corner-badge">{cornerBadge}</span>
        )}
      </div>

      {/* 3D Mitered Metal Frame + Recessed Display Chamber */}
      <div className="ib-plate-stage">
        <div className="ib-plate-bay">
          <AppImage
            idKey={idKey}
            fallbackUrl={fallbackUrl}
            alt={title}
            className="ib-plate-img"
          />
        </div>
      </div>

      {/* Bottom title & spec footer */}
      <div className="ib-plate-foot">
        <span className="ib-plate-title">{title}</span>
        {footerMeta && (
          <div className="ib-plate-meta">
            <FooterGlyph size={12} className="ib-plate-meta-icon" />
            <span>{footerMeta}</span>
          </div>
        )}
      </div>
    </button>
  );
}
