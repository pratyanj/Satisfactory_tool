import React from 'react';
import { SummaryData } from '../engine/solver';
import { items } from '../engine/data';

interface ItemsTabProps {
  summary: SummaryData | null;
}

export function ItemsTab({ summary }: ItemsTabProps) {
  if (!summary) {
    return (
      <div className="tab-empty-state">
        <span>No production data. Configure a plan and click Calculate.</span>
      </div>
    );
  }

  // Sort by rate descending
  const sorted = Object.entries(summary.allItemRates).sort((a, b) => b[1] - a[1]);

  return (
    <div className="tab-content items-tab">
      <div className="items-header">
        <span>Needed per minute</span>
      </div>

      <div className="items-list">
        {sorted.map(([itemId, rate]) => {
          const item = items[itemId];
          return (
            <div key={itemId} className="items-row">
              <div className="items-icon">
                {item?.imageUrl && (
                  <img
                    src={`https://wsrv.nl/?url=${encodeURIComponent(item.imageUrl)}&default=${encodeURIComponent(item.imageUrl)}`}
                    crossOrigin="anonymous"
                    alt={item?.name || itemId}
                  />
                )}
              </div>
              <span className="items-rate">
                {rate.toLocaleString(undefined, { maximumFractionDigits: 1 })} units/min of{' '}
                <span className="items-name">{item?.name || itemId}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Power footer */}
      <div className="tab-power-footer">
        <span>⚡ Power needed for this production: <strong>{Math.ceil(summary.totalPower).toLocaleString()} MW</strong></span>
      </div>
    </div>
  );
}
