import React, { useMemo, useState, useEffect } from 'react';
import { mam, items, buildings, MamNode, MamTree } from '../engine/data';
import { AppImage } from './AppImage';
import { HelpCircle, ArrowLeft, Clock } from 'lucide-react';

/** Format research time in seconds → compact "1m 30s" / "45s". */
function formatResearchTime(seconds?: number): string | null {
  if (seconds === undefined || seconds === null) return null;
  if (seconds <= 0) return 'Instant';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

interface Props {
  onBack: () => void;
  onNavigateItem: (itemId: string) => void;
  onNavigateBuilding: (buildingId: string) => void;
}

export function MamBrowser({ onBack, onNavigateItem, onNavigateBuilding }: Props) {
  const [selectedTreeKey, setSelectedTreeKey] = useState<string>('caterium');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const currentTree: MamTree | undefined = mam[selectedTreeKey];

  // Auto-select first node of a tree when switching trees
  useEffect(() => {
    if (currentTree && currentTree.nodes.length > 0) {
      setSelectedNodeId(currentTree.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, [selectedTreeKey, currentTree]);

  const selectedNode = useMemo(() => {
    return currentTree?.nodes.find(n => n.id === selectedNodeId) || null;
  }, [currentTree, selectedNodeId]);

  // Cell sizes for vertical layout: x = depth (rows, top→bottom), y = column (left→right)
  const CELL_W = 330; // horizontal spacing per column (y-axis in data) — wide so
                      // opposing connector curves in multi-parent clusters spread
                      // apart instead of bunching/crossing on top of each other.
  const CELL_H = 260; // vertical spacing per depth level (x-axis in data) — generous
                      // vertical gap so cross-column connector curves have room to
                      // route between rows without overlapping the cards.
  const NODE_W = 180;
  const NODE_H = 135;

  const pathD = useMemo(() => {
    const i = 1;
    const c = 12;
    const w = NODE_W;
    const h = NODE_H;
    return `M ${i},${c} L ${c},${i} L ${w - c},${i} L ${w - i},${c} L ${w - i},${h - c} L ${w - c},${h - i} L ${c},${h - i} L ${i},${h - c} Z`;
  }, [NODE_W, NODE_H]);

  const innerD = useMemo(() => {
    const i = 4;
    const c = 9;
    const w = NODE_W;
    const h = NODE_H;
    return `M 4,11 L 11,4 L ${w - 11},4 L ${w - 4},11 L ${w - 4},${h - 11} L ${w - 11},${h - 4} L 11,${h - 4} L 4,${h - 11} Z`;
  }, [NODE_W, NODE_H]);

  // SVG connector lines math — now flowing top-to-bottom
  const svgLines = useMemo(() => {
    if (!currentTree) return [];
    const lines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const node of currentTree.nodes) {
      for (const parentId of node.parents) {
        const parent = currentTree.nodes.find(n => n.id === parentId);
        if (parent) {
          // Endpoints must match the card geometry exactly. Cards are positioned
          // with left = col*CELL_W + (CELL_W-NODE_W)/2, top = row*CELL_H +
          // (CELL_H-NODE_H)/2 — so the center-X is col*CELL_W + CELL_W/2, the
          // bottom edge is row*CELL_H + (CELL_H+NODE_H)/2, and the top edge is
          // row*CELL_H + (CELL_H-NODE_H)/2. (data.x = row, data.y = column.)
          const px = parent.y * CELL_W + CELL_W / 2;
          const py = parent.x * CELL_H + (CELL_H + NODE_H) / 2;
          const cx = node.y * CELL_W + CELL_W / 2;
          const cy = node.x * CELL_H + (CELL_H - NODE_H) / 2;
          lines.push({
            id: `${parent.id}-${node.id}`,
            x1: px,
            y1: py,
            x2: cx,
            y2: cy,
          });
        }
      }
    }
    return lines;
  }, [currentTree]);

  // Dimension of scrollable SVG area — vertical layout
  const svgDimensions = useMemo(() => {
    if (!currentTree || currentTree.nodes.length === 0) return { width: 400, height: 400 };
    const maxDepth = Math.max(...currentTree.nodes.map(n => n.x), 0); // x = depth
    const maxCol   = Math.max(...currentTree.nodes.map(n => n.y), 0); // y = column
    return {
      width:  (maxCol   + 1) * CELL_W + 60,
      height: (maxDepth + 1) * CELL_H + 80,
    };
  }, [currentTree]);

  return (
    <div className="mam-container flex flex-col md:flex-row h-full w-full bg-[#0d1117] text-[#e4e3e0] overflow-hidden">
      
      {/* ── Left Sidebar (List of research trees) ── */}
      <div className="mam-sidebar w-full md:w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#f48721]">M.A.M. Research</h2>
          <button onClick={onBack} className="cdx-back-btn">
            <ArrowLeft className="w-3.5 h-3.5" /> Hub
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {Object.entries(mam).map(([key, tree]) => {
            const isActive = selectedTreeKey === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedTreeKey(key)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between border transition-all ${
                  isActive
                    ? 'bg-[#21262d] border-[#f48721] text-white shadow-md'
                    : 'bg-[#161b22]/50 border-[#30363d] hover:bg-[#21262d]/50 hover:border-[#8b949e]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 bg-[#0d1117] rounded p-1">
                    <AppImage idKey={tree.icon} alt={tree.name} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{tree.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{tree.nodes.length} Research Nodes</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center Area (Tree Map Canvas) ── */}
      <div className="flex-1 relative overflow-auto bg-[#0d1117] flex items-center justify-center p-8">
        {currentTree ? (
          <div
            style={{
              width: svgDimensions.width,
              height: svgDimensions.height,
              position: 'relative',
              margin: 'auto'
            }}
          >
            {/* SVG Connector Lines */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              {svgLines.map((line) => {
                // Smooth vertical cubic Bézier from parent-bottom to child-top.
                // Curves fan out naturally instead of overlapping like orthogonal
                // elbows did, and tuck behind the nodes (which sit at a higher z).
                const dy = Math.max(55, (line.y2 - line.y1) * 0.5);
                const d = `M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + dy}, ${line.x2} ${line.y2 - dy}, ${line.x2} ${line.y2}`;
                return (
                  <g key={line.id}>
                    {/* Conduit base drop shadow / structural thickness */}
                    <path
                      d={d}
                      stroke="#161b22"
                      strokeWidth={6}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Primary green flow conduit */}
                    <path
                      d={d}
                      stroke="#2ea44f"
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.85}
                    />
                    {/* Core neon pulse path */}
                    <path
                      d={d}
                      stroke="#8ce99a"
                      strokeWidth={1}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.9}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tree Nodes */}
            {currentTree.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              
              // Game-Accurate node image logic:
              let nodeImageKey: string = currentTree?.icon ?? 'mam';
              
              // 1. If explicit icon defined in node, use it
              if (node.icon) {
                nodeImageKey = node.icon;
              } else {
                // 2. Try the first unlock item or building ID
                const itemOrBuildingUnlock = node.unlocks.find(u => u.type === 'item' || u.type === 'building');
                if (itemOrBuildingUnlock?.id) {
                  nodeImageKey = itemOrBuildingUnlock.id;
                } else {
                  // 3. Try to extract from recipe ID
                  const recipeUnlock = node.unlocks.find(u => u.type === 'recipe');
                  if (recipeUnlock?.id) {
                    let cleanId = recipeUnlock.id;
                    if (cleanId.startsWith('recipe_')) {
                      cleanId = cleanId.substring(7);
                    }
                    nodeImageKey = cleanId;
                  } else {
                    // 4. Try node ID itself if it matches a known item/building
                    if (items[node.id] || buildings[node.id]) {
                      nodeImageKey = node.id;
                    } else {
                      // 5. Fallback to cost item ID
                      const firstCost = node.cost[0];
                      if (firstCost?.itemId) {
                        nodeImageKey = firstCost.itemId;
                      }
                    }
                  }
                }
              }

              // Strip the build_ prefix so building-unlock ids match local
              // image filenames (e.g. build_radar_tower → radar_tower.png).
              if (nodeImageKey.startsWith('build_')) nodeImageKey = nodeImageKey.slice(6);

              // Lookup image URL from items/buildings database for remote fallback
              const itemInfo = items[nodeImageKey];
              const buildingInfo = buildings[nodeImageKey];
              const resolvedFallbackUrl = itemInfo?.imageUrl || buildingInfo?.imageUrl;
              // Last-resort fallback: the tree's own icon (always present locally),
              // so a missing node image degrades to a relevant icon, never raw text.
              const treeIconFallback = `/images/${currentTree?.icon ?? 'mam'}.png`;

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    position: 'absolute',
                    left: node.y * CELL_W + (CELL_W - NODE_W) / 2,
                    top:  node.x * CELL_H + (CELL_H - NODE_H) / 2,
                    width: NODE_W,
                    height: NODE_H,
                    zIndex: 20,
                    clipPath: 'polygon(0px 12px, 12px 0px, calc(100% - 12px) 0px, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0px calc(100% - 12px))'
                  }}
                  className={`flex flex-col items-center justify-between p-2 pb-2.5 border-0 transition-all text-center group cursor-pointer select-none relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#251b10] to-[#12161b]'
                      : 'bg-gradient-to-b from-[#181d24] to-[#0f1318] hover:from-[#1f252f] hover:to-[#12171c]'
                  }`}
                >
                  {/* Sci-Fi Border Overlay */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${NODE_W} ${NODE_H}`}
                  >
                    <defs>
                      <filter id={`glow-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComponentTransfer in="blur" result="glow">
                          <feFuncA type="linear" slope="1.5"/>
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode in="glow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Outer Clipped Border */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? '#f48721' : '#30363d'}
                      strokeWidth={isSelected ? 1.5 : 1}
                      filter={isSelected ? `url(#glow-${node.id})` : undefined}
                      className="transition-all duration-300 group-hover:stroke-[#f48721]/60"
                    />

                    {/* Inner Tech Dashed Path */}
                    <path
                      d={innerD}
                      fill="none"
                      stroke={isSelected ? '#f48721' : '#30363d'}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      opacity={isSelected ? 0.35 : 0.12}
                      className="transition-all duration-300 group-hover:opacity-25"
                    />

                    {/* Corner Crosshairs */}
                    <path d="M 6,10 L 6,6 L 10,6" fill="none" stroke={isSelected ? '#f48721' : '#8b949e'} strokeWidth={1} opacity={isSelected ? 0.5 : 0.25} />
                    <path d={`M 6,${NODE_H - 10} L 6,${NODE_H - 6} L 10,${NODE_H - 6}`} fill="none" stroke={isSelected ? '#f48721' : '#8b949e'} strokeWidth={1} opacity={isSelected ? 0.5 : 0.25} />
                    <path d={`M ${NODE_W - 10},${NODE_H - 6} L ${NODE_W - 6},${NODE_H - 6} L ${NODE_W - 6},${NODE_H - 10}`} fill="none" stroke={isSelected ? '#f48721' : '#8b949e'} strokeWidth={1} opacity={isSelected ? 0.5 : 0.25} />
                    <path d={`M ${NODE_W - 10},6 L ${NODE_W - 6},6 L ${NODE_W - 6},10`} fill="none" stroke={isSelected ? '#f48721' : '#8b949e'} strokeWidth={1} opacity={isSelected ? 0.5 : 0.25} />
                  </svg>

                  {/* Scanline Terminal Grid Background */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.09]"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(244, 135, 33, 0.15) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(244, 135, 33, 0.15) 1px, transparent 1px),
                        repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4) 1px, transparent 1px, transparent 3px)
                      `,
                      backgroundSize: '10px 10px, 10px 10px, 100% 4px'
                    }}
                  />

                  {/* Top Bar HUD — node identifier + research time (informational only) */}
                  <div className="w-full flex items-center justify-between px-3 pt-1.5 z-10 select-none">
                    <span className="text-[8px] font-mono text-[#f48721]/60 font-semibold transition-colors group-hover:text-[#f48721]/80">
                      NODE_{node.id.substring(0, 4).toUpperCase()}
                    </span>
                    {formatResearchTime(node.time) && (
                      <span className="flex items-center gap-0.5 text-[8px] font-mono text-gray-500 font-bold">
                        <Clock className="w-2 h-2" />
                        {formatResearchTime(node.time)}
                      </span>
                    )}
                  </div>

                  {/* Analyzer Reticle Frame */}
                  <div className="relative w-[62px] h-[62px] flex items-center justify-center z-10 mt-0.5 select-none">
                    {/* Rotating outer radar ticks */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-[#f48721]/20 animate-[spin_12s_linear_infinite] group-hover:border-[#f48721]/45 group-hover:animate-[spin_4s_linear_infinite]" />
                    
                    {/* Inner glowing circular backdrop */}
                    <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-[#f48721]/5 to-transparent border border-[#30363d]/60 group-hover:from-[#f48721]/12 group-hover:border-[#f48721]/30 transition-all duration-300" />
                    
                    {/* Crosshair compass ticks */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-[#f48721]/40" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-[#f48721]/40" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-1 bg-[#f48721]/40" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-1 bg-[#f48721]/40" />

                    {/* Node Image */}
                    <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <AppImage idKey={nodeImageKey} fallbackUrl={resolvedFallbackUrl} secondaryFallbackUrl={treeIconFallback} alt={node.name} className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>

                  {/* Name and Costs */}
                  <div className="w-full flex flex-col items-center justify-end z-10 px-2 mt-1">
                    {/* Node Name */}
                    <div className={`text-[10px] font-bold leading-tight line-clamp-2 w-full transition-colors ${
                      isSelected ? 'text-[#f48721]' : 'text-[#e4e3e0] group-hover:text-white'
                    }`}>
                      {node.name}
                    </div>

                    {/* Cost Indicators */}
                    <div className="flex gap-1.5 items-center justify-center mt-1.5 h-5">
                      {node.cost.length > 0 ? (
                        <>
                          {node.cost.slice(0, 3).map((c, i) => (
                            <div 
                              key={i} 
                              className="w-4 h-4 rounded-sm bg-[#0d1117]/90 p-0.5 border border-[#30363d] hover:border-[#f48721]/50 transition-colors"
                              title={`${c.amount}x ${c.name}`}
                            >
                              <AppImage idKey={c.itemId || 'mam'} alt={c.name} className="w-full h-full object-contain" />
                            </div>
                          ))}
                          {node.cost.length > 3 && (
                            <span className="text-[7.5px] font-mono text-gray-500 font-bold">
                              +{node.cost.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[8px] font-mono text-[#2ea44f] font-bold tracking-wider uppercase bg-[#2ea44f]/10 px-1.5 py-0.5 rounded-sm border border-[#2ea44f]/20">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">No tree selected.</div>
        )}
      </div>

      {/* ── Right Sidebar (Node Inspector Panel) ── */}
      <div className="mam-inspector w-full md:w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col shrink-0">
        {selectedNode ? (
          <div className="h-full flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-[#30363d]">
              <h3 className="text-sm font-black text-white">{selectedNode.name}</h3>
              <div className="flex items-center justify-between mt-1">
                <div className="text-[10px] font-mono text-[#f48721] font-bold">RESEARCH NODE</div>
                {formatResearchTime(selectedNode.time) && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-[#8b949e]">
                    <Clock className="w-3 h-3" />
                    {formatResearchTime(selectedNode.time)}
                  </div>
                )}
              </div>
            </div>

            {/* Content scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#8b949e]">Description</span>
                <p className="text-xs leading-relaxed text-[#8b949e] bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]/50 whitespace-pre-wrap">{selectedNode.description}</p>
              </div>

              {/* Research Costs */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#8b949e]">Analysis Cost</span>
                <div className="space-y-1.5">
                  {selectedNode.cost.map((c, idx) => {
                    const isKnownItem = c.itemId && items[c.itemId];
                    return (
                      <button
                        key={idx}
                        onClick={() => isKnownItem && c.itemId && onNavigateItem(c.itemId)}
                        disabled={!isKnownItem}
                        className={`w-full flex items-center justify-between p-2 rounded border border-[#30363d]/80 text-left transition-colors ${
                          isKnownItem ? 'bg-[#1f242c] hover:bg-[#2b313c]' : 'bg-[#0d1117] cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {c.itemId ? (
                            <div className="w-6 h-6 p-0.5 bg-[#0d1117] rounded">
                              <AppImage idKey={c.itemId} alt={c.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <HelpCircle className="w-6 h-6 text-gray-500" />
                          )}
                          <span className="text-xs font-semibold">{c.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#f48721]">x{c.amount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Research Unlocks */}
              {selectedNode.unlocks.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#8b949e]">Unlocks / Rewards</span>
                  <div className="space-y-1.5">
                    {selectedNode.unlocks.map((u, idx) => {
                      const isItem = u.type === 'item' && u.id && items[u.id];
                      const isBuilding = u.type === 'building' && u.id && buildings[u.id];

                      const handleClick = () => {
                        if (isItem && u.id) onNavigateItem(u.id);
                        if (isBuilding && u.id) onNavigateBuilding(u.id);
                      };

                      return (
                        <button
                          key={idx}
                          onClick={handleClick}
                          disabled={!isItem && !isBuilding}
                          className={`w-full flex items-center gap-2.5 p-2 rounded border border-[#30363d]/80 text-left transition-colors ${
                            isItem || isBuilding ? 'bg-[#1f242c] hover:bg-[#2b313c]' : 'bg-[#0d1117] cursor-default'
                          }`}
                        >
                          <div className="w-6 h-6 p-0.5 bg-[#0d1117] rounded flex-shrink-0 flex items-center justify-center">
                            {u.id ? (
                              <AppImage idKey={u.id} alt={u.name} className="w-full h-full object-contain" />
                            ) : (
                              <HelpCircle className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{u.name}</div>
                            <div className="text-[9px] uppercase font-mono text-gray-400 mt-0.5">{u.type}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-xs flex flex-col items-center justify-center h-full gap-2">
            <HelpCircle className="w-8 h-8 text-gray-600" />
            Select a research node to view analysis costs and rewards.
          </div>
        )}
      </div>
    </div>
  );
}
