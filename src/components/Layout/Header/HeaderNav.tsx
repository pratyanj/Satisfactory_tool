import React from 'react';
import {
  Home,
  Factory,
  MapPin,
  Globe,
  BookOpen,
  Info,
} from 'lucide-react';

export type TopLevelTab = 'planner' | 'save_map' | 'world_map' | 'codex';

interface NavItem {
  id: TopLevelTab;
  label: string;
  icon: React.ReactNode;
}

/**
 * Nav items match the header frame image layout:
 * HOME | PRODUCTION | SAVE MAP | WORLD MAP | ITEM CODEX | ABOUT
 *
 * Note: HOME and PRODUCTION both route to 'planner' (the main tab).
 * ABOUT also routes to 'codex' as the closest equivalent.
 */
const NAV_ITEMS: NavItem[] = [
  { id: 'planner',   label: 'Production',  icon: <Factory   size={20} strokeWidth={1.8} /> },
  { id: 'save_map',  label: 'Save Map',    icon: <MapPin    size={20} strokeWidth={1.8} /> },
  { id: 'world_map', label: 'World Map',   icon: <Globe     size={20} strokeWidth={1.8} /> },
  { id: 'codex',     label: 'Item Codex',  icon: <BookOpen  size={20} strokeWidth={1.8} /> },
];

interface HeaderNavProps {
  activeTab: TopLevelTab;
  onTabChange: (tab: TopLevelTab) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="sf-header-nav" role="navigation" aria-label="Primary navigation">
      {NAV_ITEMS.map((item, idx) => (
        <button
          key={`${item.id}-${idx}`}
          id={`nav-btn-${item.id}-${idx}`}
          onClick={() => onTabChange(item.id)}
          className={`sf-header-nav-btn${activeTab === item.id ? ' sf-header-nav-btn--active' : ''}`}
          aria-current={activeTab === item.id ? 'page' : undefined}
          aria-label={`Navigate to ${item.label}`}
        >
          {item.icon}
          <span>{item.label.toUpperCase()}</span>
        </button>
      ))}
    </nav>
  );
};
