import React from 'react';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';

interface BuildingsTabProps {
  summary: SummaryData | null;
}

export function BuildingsTab({ summary }: BuildingsTabProps) {
  if (!summary) {
    return (
      <div className="tab-empty-state">
        <span>No production data. Configure a plan and click Calculate.</span>
      </div>
    );
  }

  const details = Object.values(summary.buildingDetails);

  // Aggregate all produced items across all buildings for the "Total" section
  const totalItems: Record<string, number> = {};
  for (const detail of details) {
    for (const [itemId, rate] of Object.entries(detail.produces ?? {})) {
      totalItems[itemId] = (totalItems[itemId] || 0) + rate;
    }
  }
  // Sort total items by rate descending
  const sortedTotalItems = Object.entries(totalItems).sort((a, b) => b[1] - a[1]);

  return (
    <div className="tab-content buildings-tab">
      {/* Building rows */}
      <div className="buildings-list">
        {details.map((detail) => {
          const machine = machines[detail.machineId];
          const count = Math.ceil(detail.count);
          // Items produced by this building
          const producedEntries = Object.entries(detail.produces ?? {});

          return (
            <div key={detail.machineId} className="buildings-row">
              {/* Left: building icon + name + count */}
              <div className="buildings-left">
                <div className="buildings-icon">
                  {machine?.imageUrl && (
                    <img
                      src={`https://wsrv.nl/?url=${encodeURIComponent(machine.imageUrl)}&default=${encodeURIComponent(machine.imageUrl)}`}
                      crossOrigin="anonymous"
                      alt={machine?.name}
                    />
                  )}
                </div>
                <span className="buildings-count">{count}x</span>
                <span className="buildings-name">{machine?.name || detail.machineId}</span>
              </div>

              {/* Right: items produced (compact inline with icons) */}
              <div className="buildings-right">
                {producedEntries.map(([itemId, rate], idx) => {
                  const item = items[itemId];
                  return (
                    <span key={itemId} className="buildings-item-chip">
                      {idx > 0 && <span className="buildings-separator">,</span>}
                      {rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}x
                      <span className="buildings-item-icon">
                        {item?.imageUrl && (
                          <img
                            src={`https://wsrv.nl/?url=${encodeURIComponent(item.imageUrl)}&default=${encodeURIComponent(item.imageUrl)}`}
                            crossOrigin="anonymous"
                            alt={item?.name || itemId}
                          />
                        )}
                      </span>
                      <span className="buildings-item-name">{item?.name || itemId}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total section */}
      <div className="buildings-total-section">
        <div className="buildings-total-label">Total:</div>
        <div className="buildings-total-list">
          {sortedTotalItems.map(([itemId, rate]) => {
            const item = items[itemId];
            return (
              <div key={itemId} className="buildings-total-row">
                <span className="buildings-total-count">
                  {rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}x
                </span>
                <span className="buildings-item-icon">
                  {item?.imageUrl && (
                    <img
                      src={`https://wsrv.nl/?url=${encodeURIComponent(item.imageUrl)}&default=${encodeURIComponent(item.imageUrl)}`}
                      crossOrigin="anonymous"
                      alt={item?.name || itemId}
                    />
                  )}
                </span>
                <span className="buildings-total-name">{item?.name || itemId}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Power footer */}
      <div className="tab-power-footer">
        <span>⚡ Power needed for this production: <strong>{Math.ceil(summary.totalPower).toLocaleString()} MW</strong></span>
      </div>
    </div>
  );
}
