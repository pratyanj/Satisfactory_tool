import React from 'react';
import { Copy, Check } from 'lucide-react';
import { HeaderLogo } from './HeaderLogo';
import { HeaderNav, TopLevelTab } from './HeaderNav';
import './header.css';

interface HeaderProps {
  activeTab: TopLevelTab;
  onTabChange: (tab: TopLevelTab) => void;
  /** Show share button only on certain tabs */
  showShare?: boolean;
  onShare?: () => void;
  copied?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  showShare = false,
  onShare,
  copied = false,
}) => {
  return (
    <header className="sf-header" role="banner">
      {/* Logo / Brand */}
      <HeaderLogo onClick={() => onTabChange('planner')} />

      {/* Primary Navigation */}
      <HeaderNav activeTab={activeTab} onTabChange={onTabChange} />

      {/* Actions */}
      <div className="sf-header-actions">
        {showShare && (
          <button
            id="header-share-btn"
            onClick={onShare}
            className={`sf-share-btn ${copied ? 'sf-share-btn--copied' : ''}`}
            aria-label={copied ? 'Plan copied to clipboard' : 'Share production plan'}
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2} />
                Share Plan
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
