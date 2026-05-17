import React from 'react';

interface HeaderLogoProps {
  onClick?: () => void;
}

/**
 * Logo text block — rendered over the dark left panel of the header frame.
 * The hex badge icon is already baked into the background frame image,
 * so we only overlay the text portion here.
 */
export const HeaderLogo: React.FC<HeaderLogoProps> = ({ onClick }) => {
  return (
    <div
      className="sf-header-logo-block"
      onClick={onClick}
      role="link"
      tabIndex={0}
      aria-label="Go to Production Planner"
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="sf-header-logo-text">
        <div className="sf-header-logo-title">
          SATISFACTORY <span>TOOL</span>
        </div>
        <div className="sf-header-logo-tagline">PLAN. OPTIMIZE. PRODUCE.</div>
      </div>
    </div>
  );
};
