import React, { useState } from 'react';
import './header.css';

interface HeaderNavProps {
  topLevelTab: string;
  handleTopLevelTab: (tab: any) => void;
  generateShareLink?: () => void;
  copied?: boolean;
}

export function HeaderNav({
  topLevelTab,
  handleTopLevelTab,
  generateShareLink,
  copied,
}: HeaderNavProps) {
  const plannerValue = topLevelTab === 'power_planner' ? 'power_planner' : 'planner';
  const isPlannerActive = topLevelTab === 'planner' || topLevelTab === 'power_planner';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="sf-header-wrapper">
      <div className={`sf-header-container ${isMenuOpen ? 'menu-expanded' : ''}`}>
        
        {/* Caution Stripes */}
        <div className="sf-caution-stripes" />
        <div className="sf-bottom-stripes" />

        {/* Left Section (Orange + Logo + Title) */}
        <div className="sf-header-orange-block">
          
        </div>

        <div className="sf-header-title-plate">
          <div className="sf-screw sf-screw-tl" />
          <div className="sf-screw sf-screw-tr" />
          <div className="sf-screw sf-screw-bl" />
          <div className="sf-screw sf-screw-br" />
          <div className="sf-title-main">SATISFACTORY</div>
          <div className="sf-title-sub">TOOL</div>
          <div className="sf-title-micro">PLAN. OPTIMIZE. PRODUCE.</div>
        </div>

        {/* Hamburger Menu Button */}
        <button
          className={`sf-hamburger-btn ${isMenuOpen ? 'is-open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          <span className="sf-hamburger-line"></span>
          <span className="sf-hamburger-line"></span>
          <span className="sf-hamburger-line"></span>
        </button>

        {/* Middle Section (Navigation) */}
        <div className="sf-nav-cutout-border" />
        <div className={`sf-header-nav-cutout ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="sf-nav-links">
            <div className={`sf-nav-select-wrap ${isPlannerActive ? 'active' : ''}`}>
              <div className="sf-nav-select-label" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Plan
              </div>
              <div className="sf-planner-segmented" role="tablist" aria-label="Planner Mode">
                <button
                  role="tab"
                  aria-selected={plannerValue === 'planner'}
                  onClick={() => { handleTopLevelTab('planner'); setIsMenuOpen(false); }}
                  className={`sf-planner-segment ${plannerValue === 'planner' ? 'is-active' : ''}`}
                >
                  Production
                </button>
                <button
                  role="tab"
                  aria-selected={plannerValue === 'power_planner'}
                  onClick={() => { handleTopLevelTab('power_planner'); setIsMenuOpen(false); }}
                  className={`sf-planner-segment ${plannerValue === 'power_planner' ? 'is-active' : ''}`}
                >
                  Power
                </button>
              </div>
            </div>
            <button
              onClick={() => { handleTopLevelTab('world_map'); setIsMenuOpen(false); }}
              className={`sf-nav-btn ${topLevelTab === 'world_map' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              World Map
            </button>
            <button
              onClick={() => { handleTopLevelTab('codex'); setIsMenuOpen(false); }}
              className={`sf-nav-btn ${topLevelTab === 'codex' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Item Codex
            </button>
            <button
              onClick={() => { handleTopLevelTab('sandbox'); setIsMenuOpen(false); }}
              className={`sf-nav-btn ${topLevelTab === 'sandbox' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Sandbox
            </button>
            {topLevelTab === 'planner' && generateShareLink && (
              <button
                onClick={() => { generateShareLink(); setIsMenuOpen(false); }}
                className="sf-nav-btn"
                style={{ flex: 0.5, color: copied ? '#22c55e' : undefined, borderColor: copied ? '#22c55e' : undefined }}
              >
                {copied ? 'COPIED!' : 'SHARE'}
              </button>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="sf-header-right">
          <div className="sf-ficsit-logo">FICSIT</div>
          <div className="sf-warning-lights">
            <div className="sf-light" />
            <div className="sf-light" />
            <div className="sf-light" />
          </div>
          <div className="sf-ficsit-logo" style={{ opacity: 0.3, transform: 'scaleY(-1)', fontSize: '18px' }}>FICSIT</div>
        </div>
      </div>
    </div>
  );
}
