import React from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Pagination } from './Pagination';

export interface CategoryOption {
  name: string;
  count: number;
}

interface CodexBrowserShellProps {
  /** Header telemetry title, e.g. "FICSIT // Item Codex". */
  title: string;
  /** Entity noun for counters & empty state, e.g. "items" or "buildings". */
  entityPlural: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  categories: CategoryOption[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  filteredCount: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onBack: () => void;
  /** 'grid' wraps children in responsive card grid; 'list' uses full-width max-1280 list wrapper. */
  layout?: 'grid' | 'list';
  children: React.ReactNode;
}

const PAGE_SIZE_OPTIONS = [20, 40, 60] as const;

/**
 * Shared Industrial Hardware Plate shell for ItemBrowser, BuildingBrowser, and RecipeBrowser,
 * unifying the outer header, search/pagesize bar, and category filter chips.
 */
export function CodexBrowserShell({
  title,
  entityPlural,
  searchPlaceholder,
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  pageSize,
  onPageSizeChange,
  filteredCount,
  page,
  pageCount,
  onPageChange,
  onBack,
  layout = 'grid',
  children,
}: CodexBrowserShellProps) {
  return (
    <div className="ib-root">
      {/* Top Gunmetal Codex Header */}
      <header className="ib-topbar">
        <div className="ib-topbar-inner">
          <div className="ib-topbar-left">
            <button type="button" className="cdx-back-btn ib-back-btn" onClick={onBack}>
              <ArrowLeft size={13} />
              <span>Codex</span>
            </button>
            <span className="ib-plate-hazard" aria-hidden="true" />
            <span className="ib-topbar-title">{title}</span>
          </div>
          <div className="ib-topbar-status">
            <span className="ib-status-dot" />
            <span>DATABASE // ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Scrollable Container Housing Control Plate + Hardware Cards */}
      <div className="ib-grid-wrap">
        {/* Hardware Plate Control Deck */}
        <section className="ib-controls-plate" aria-label="Filters and search">
          {/* Top Bar: Search + Show Page Size + Count Badge */}
          <div className="ib-controls-head">
            <div className="ib-search-wrap">
              <Search size={14} className="ib-search-icon" />
              <input
                type="text"
                className="ib-search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="ib-search-clear"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="ib-controls-right">
              <div className="ib-pagesize-selector" role="group" aria-label="Items per page">
                <span className="ib-pagesize-label">SHOW</span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`ib-pagesize-btn ${pageSize === size ? 'ib-pagesize-btn--active' : ''}`}
                    onClick={() => onPageSizeChange(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="ib-count-plate">
                <span className="ib-count-num">{filteredCount}</span>
                <span className="ib-count-label">{entityPlural}</span>
              </div>
            </div>
          </div>

          {/* Recessed Filter Chip Bay */}
          <div className="ib-cats-bay" role="tablist" aria-label="Categories">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`ib-cat-pill ${isActive ? 'ib-cat-pill--active' : ''}`}
                  onClick={() => onCategoryChange(cat.name)}
                >
                  <span className="ib-cat-pill-main">
                    <span className="ib-cat-pill-mark" aria-hidden="true" />
                    <span className="ib-cat-pill-name">{cat.name}</span>
                  </span>
                  <span className="ib-cat-pill-count">{cat.count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Grid & Empty State */}
        {filteredCount === 0 ? (
          <div className="ib-empty">
            No {entityPlural} found{search ? ` for "${search}"` : ''}
          </div>
        ) : (
          <>
            <div className={layout === 'list' ? 'cdx-recipe-wrap' : 'ib-grid'}>
              {children}
            </div>
            <Pagination page={page} pageCount={pageCount} onChange={onPageChange} />
          </>
        )}
      </div>
    </div>
  );
}
