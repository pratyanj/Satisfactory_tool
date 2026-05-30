/**
 * FICSIT Sandbox — Blueprint Shelf
 *
 * Manages saveable modular factory layout blocks backed by localStorage.
 */

import React, { useState, useEffect } from 'react';
import { useSandbox } from './SandboxTab';
import {
  loadBlueprints,
  saveBlueprint,
  deleteBlueprint,
} from '../../engine/sandbox/serializer';
import type { BlueprintEntry, ClipboardEntry } from '../../engine/sandbox/types';
import { getMachineEntry } from '../../engine/sandbox/machineRegistry';

interface BlueprintShelfProps {
  selectedMachineIds: string[];
}

export function BlueprintShelf({ selectedMachineIds }: BlueprintShelfProps) {
  const { state, dispatch } = useSandbox();
  const [blueprints, setBlueprints] = useState<BlueprintEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');

  // Load blueprints on mount
  useEffect(() => {
    setBlueprints(loadBlueprints());
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;

    let layoutToSave: ClipboardEntry[] | null = null;

    if (selectedMachineIds.length > 0) {
      const selected = state.machines.filter((m) =>
        selectedMachineIds.includes(m.instanceId)
      );
      if (selected.length > 0) {
        const minCol = Math.min(...selected.map((m) => m.position.col));
        const minRow = Math.min(...selected.map((m) => m.position.row));
        layoutToSave = selected.map((m) => ({
          machineId: m.machineId,
          relCol: m.position.col - minCol,
          relRow: m.position.row - minRow,
          rotation: m.rotation,
          recipeId: m.recipeId,
          overclock: m.overclock,
          fuelId: m.fuelId,
          switchOn: m.switchOn,
        }));
      }
    } else if (state.clipboard) {
      layoutToSave = state.clipboard;
    }

    if (!layoutToSave || layoutToSave.length === 0) {
      alert('Select multiple machines on the canvas first to save a blueprint.');
      return;
    }

    const newBp: BlueprintEntry = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      name: name.trim(),
      createdAt: Date.now(),
      layout: layoutToSave,
      machineCount: layoutToSave.length,
    };

    saveBlueprint(newBp);
    setName('');
    setIsSaving(false);
    setBlueprints(loadBlueprints());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this blueprint?')) {
      deleteBlueprint(id);
      setBlueprints(loadBlueprints());
    }
  };

  const handleStamp = (layout: ClipboardEntry[]) => {
    dispatch({ type: 'LOAD_CLIPBOARD', clipboard: layout });
    window.dispatchEvent(new CustomEvent('sandbox:stamp-blueprint'));
  };

  const renderPreview = (layout: ClipboardEntry[]) => {
    if (layout.length === 0) return null;
    const cols = layout.map((e) => e.relCol);
    const rows = layout.map((e) => e.relRow);
    const maxCol = Math.max(...cols, 0);
    const maxRow = Math.max(...rows, 0);
    
    // Scale preview size based on bounds
    const previewScale = 8;
    const padding = 4;
    const w = (maxCol + 1) * previewScale + padding * 2;
    const h = (maxRow + 1) * previewScale + padding * 2;

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="blueprint-preview-svg"
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {layout.map((entry, idx) => {
          const entryData = getMachineEntry(entry.machineId);
          const footprint = entryData?.footprint ?? { width: 1, height: 1 };
          const fill = entryData?.accentColor ?? '#f48721';
          return (
            <rect
              key={idx}
              x={entry.relCol * previewScale + padding}
              y={entry.relRow * previewScale + padding}
              width={footprint.width * previewScale - 1}
              height={footprint.height * previewScale - 1}
              rx={1}
              fill={fill}
              opacity={0.65}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={0.5}
            />
          );
        })}
      </svg>
    );
  };

  const hasSelection = selectedMachineIds.length > 0;
  const canSave = hasSelection || !!state.clipboard;

  return (
    <div className="sandbox-blueprint-shelf">
      <div className="sandbox-sidebar-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', marginBottom: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', letterSpacing: '0.05em' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#eab308' }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          BLUEPRINTS
        </span>
        {canSave && !isSaving && (
          <button
            className="sandbox-blueprint-btn-add"
            onClick={() => setIsSaving(true)}
            style={{
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.3)',
              color: '#eab308',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '9px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + Save {hasSelection ? 'Selection' : 'Clipboard'}
          </button>
        )}
      </div>

      {isSaving && (
        <div
          className="sandbox-blueprint-save-form"
          style={{
            background: 'rgba(10,11,14,0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px',
            padding: '8px',
            marginBottom: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <input
            type="text"
            placeholder="Blueprint Name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            style={{
              background: '#0a0b0e',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: '4px',
              padding: '4px 6px',
              fontSize: '10px',
            }}
          />
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsSaving(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                background: '#eab308',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '2px 8px',
                opacity: name.trim() ? 1 : 0.5,
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {blueprints.length === 0 ? (
        <div
          style={{
            fontSize: '9.5px',
            color: '#6b7280',
            textAlign: 'center',
            padding: '16px 8px',
            border: '1px dashed rgba(255,255,255,0.05)',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.1)',
          }}
        >
          No blueprints saved yet. Multi-select machines on canvas and click "+" to save!
        </div>
      ) : (
        <div
          className="sandbox-blueprint-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {blueprints.map((bp) => (
            <div
              key={bp.id}
              className="sandbox-blueprint-item"
              onClick={() => handleStamp(bp.layout)}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(234,179,8,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
              }}
              title={`Saved on ${new Date(bp.createdAt).toLocaleDateString()}`}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {renderPreview(bp.layout)}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: '600',
                      color: '#e4e3e0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {bp.name}
                  </span>
                  <span style={{ fontSize: '8.5px', color: '#6b7280' }}>
                    {bp.machineCount} building{bp.machineCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStamp(bp.layout);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#eab308',
                    padding: '4px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                  title="Stamp this layout"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(bp.id, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    padding: '4px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    opacity: 0.6,
                  }}
                  title="Delete blueprint"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
