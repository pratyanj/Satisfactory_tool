import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** Windowed page list: first, last, current ±1, with ellipses. */
function pageWindow(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount - 1) out.push('…');
  out.push(pageCount);
  return out;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = pageWindow(page, pageCount);

  return (
    <nav className="cdx-pager" aria-label="Pagination">
      <div className="cdx-pager-plate">
        <div className="cdx-pager-tray">
          <button
            type="button"
            className="cdx-pager-btn cdx-pager-btn--nav"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </button>

          <div className="cdx-pager-pages">
            {pages.map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="cdx-pager-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`cdx-pager-btn ${p === page ? 'cdx-pager-btn--active' : ''}`}
                  onClick={() => onChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="cdx-pager-btn cdx-pager-btn--nav"
            disabled={page >= pageCount}
            onClick={() => onChange(page + 1)}
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </nav>
  );
}
