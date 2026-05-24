/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputForm } from './components/InputForm';
import { Summary } from './components/Summary';
import { FactoryGraph } from './components/Graph/FactoryGraph';
import { TreeList } from './components/TreeList';
import { ItemsTab } from './components/ItemsTab';
import { BuildingsTab } from './components/BuildingsTab';
import { MapTab } from './components/Map/MapTab';
import { WorldMapTab } from './components/Map/WorldMapTab';
import { ItemBrowser } from './components/ItemBrowser';
import { HeaderNav } from './components/Layout/Header/HeaderNav';
import { BodyFrame } from './components/Layout/BodyFrame/BodyFrame';
import { ParsedSave } from './types/save';
import { aggregateDiagnosticsFlowA, aggregateDiagnosticsFlowB } from './engine/diagnostics/diagnosticsAggregator';
import { DiagnosticsTab } from './components/DiagnosticsTab';

import { solve, calculateSummary, SummaryData, SolverNode, RecipeSelectionMap } from './engine/solver';
import { mapSolverResultToGraph, LayoutMode } from './engine/graphMapper';
import { BeltId, MachineId, items, machines, belts } from './engine/data';
import { Edge, Node } from '@xyflow/react';

type MainTab = 'network_graph' | 'tree_list' | 'items' | 'buildings' | 'world_map' | 'diagnostics';

const TAB_CONFIG: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'network_graph',
    label: 'Network graph',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    id: 'tree_list',
    label: 'Tree list',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'items',
    label: 'Items',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    id: 'buildings',
    label: 'Buildings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
        <path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" />
        <path d="M8 10h.01" /><path d="M8 14h.01" />
      </svg>
    ),
  },
];


type TopLevelTab = 'planner' | 'save_map' | 'world_map' | 'codex';

function parseRecipeSelections(value: unknown): RecipeSelectionMap {
  if (!value || typeof value !== 'object') return {};
  const result: RecipeSelectionMap = {};
  for (const [itemId, recipeId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof recipeId === 'string') {
      result[itemId] = recipeId;
    }
  }
  return result;
}

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [rootNode, setRootNode] = useState<SolverNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedSave, setParsedSave] = useState<ParsedSave | null>(null);


  const [lastInput, setLastInput] = useState<{ itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections: RecipeSelectionMap }>({ itemId: 'copper_sheet', rate: 120, minerId: 'miner_mk1', beltId: 'mk1', recipeSelections: {} });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('aggregated');
  const [mainTab, setMainTab] = useState<MainTab>('network_graph');
  const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>('planner');
  const [selectedCodexItemId, setSelectedCodexItemId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!graphContainerRef.current) return;
    if (!document.fullscreenElement) {
      graphContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsGraphFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync URL path whenever navigation state changes (supports browser history navigation!)
  const updatePath = useCallback((top: TopLevelTab, sub: MainTab, codexItemId?: string | null) => {
    let path = '';
    if (top === 'planner') {
      path = `/planner/${sub}`;
    } else if (top === 'codex') {
      path = codexItemId ? `/codex/${codexItemId}` : '/codex';
    } else {
      path = `/${top}`;
    }
    // Only push to history if pathname is different to avoid duplicate history states
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    sessionStorage.setItem('sf_tab', top);
    sessionStorage.setItem('sf_sub', sub);
    if (top === 'codex') {
      sessionStorage.setItem('sf_codex_item', codexItemId || '');
    }
  }, []);

  const handleTopLevelTab = useCallback((tab: TopLevelTab) => {
    setTopLevelTab(tab);
    updatePath(tab, mainTab, tab === 'codex' ? selectedCodexItemId : null);
  }, [mainTab, selectedCodexItemId, updatePath]);

  const handleMainTab = useCallback((tab: MainTab) => {
    setMainTab(tab);
    updatePath(topLevelTab, tab, topLevelTab === 'codex' ? selectedCodexItemId : null);
  }, [topLevelTab, selectedCodexItemId, updatePath]);

  // Parse path and hash, and sync application state
  const parseAndApplyRoute = useCallback(() => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;

    try {
      // 1. Check for shared plan first (which is in the hash)
      if (hash.startsWith('#plan=')) {
        const encoded = hash.replace('#plan=', '');
        const decoded = JSON.parse(atob(decodeURIComponent(encoded)));
        if (decoded.i && items[decoded.i] && typeof decoded.r === 'number' && decoded.m && machines[decoded.m] && decoded.b && belts[decoded.b] && (decoded.l === 'aggregated' || decoded.l === 'expanded')) {
          setLastInput({
            itemId: decoded.i,
            rate: decoded.r,
            minerId: decoded.m,
            beltId: decoded.b,
            recipeSelections: parseRecipeSelections(decoded.ar),
          });
          setLayoutMode(decoded.l);
          const top: TopLevelTab = decoded.t ?? 'planner';
          const sub: MainTab = decoded.s ?? 'network_graph';
          setTopLevelTab(top);
          setMainTab(sub);
          setSelectedCodexItemId(null);
          
          // Clear hash plan after applying it to clean the URL bar
          const path = top === 'planner' ? `/planner/${sub}` : `/${top}`;
          window.history.replaceState(null, '', path);
        }
        return;
      }

      // 2. Check for hash-router fallback paths like #/codex, #/planner/network_graph, #codex, etc.
      const cleanHash = hash.replace(/^#\/?/, '');
      if (cleanHash && !cleanHash.startsWith('plan=') && !cleanHash.startsWith('tab=')) {
        const parts = cleanHash.split('/');
        const top = parts[0] as TopLevelTab;
        if (['planner', 'save_map', 'world_map', 'codex'].includes(top)) {
          setTopLevelTab(top);
          let sub: MainTab = 'network_graph';
          let itemId: string | null = null;
          if (top === 'planner' && parts[1]) {
            const parsedSub = parts[1] as MainTab;
            if (['network_graph', 'tree_list', 'items', 'buildings'].includes(parsedSub)) {
              sub = parsedSub;
              setMainTab(parsedSub);
            }
          } else if (top === 'codex') {
            itemId = parts[1] || null;
            setSelectedCodexItemId(itemId);
          }
          
          // Clean the URL bar by replacing the hash with the clean pathname
          const cleanPath = top === 'planner' ? `/planner/${sub}` : (itemId ? `/codex/${itemId}` : `/${top}`);
          window.history.replaceState(null, '', cleanPath);
          return;
        }
      }

      // 3. Parse standard pathnames, e.g. /planner/network_graph or /codex
      if (pathname && pathname !== '/') {
        const parts = pathname.slice(1).split('/');
        const top = parts[0] as TopLevelTab;
        if (['planner', 'save_map', 'world_map', 'codex'].includes(top)) {
          setTopLevelTab(top);
          if (top === 'planner' && parts[1]) {
            const sub = parts[1] as MainTab;
            if (['network_graph', 'tree_list', 'items', 'buildings'].includes(sub)) {
              setMainTab(sub);
            }
          } else if (top === 'codex') {
            const itemId = parts[1] || null;
            setSelectedCodexItemId(itemId);
          }
          return;
        }
      }

      // 4. Backwards compatibility for old hash structure #tab=...
      if (hash.startsWith('#tab=')) {
        const params = new URLSearchParams(hash.slice(1));
        const top = (params.get('tab') ?? '') as TopLevelTab;
        const sub = (params.get('sub') ?? '') as MainTab;
        if (['planner', 'save_map', 'world_map', 'codex'].includes(top)) setTopLevelTab(top);
        if (['network_graph', 'tree_list', 'items', 'buildings'].includes(sub)) setMainTab(sub);
        setSelectedCodexItemId(null);
        
        // Sync URL to clean pathname
        const path = top === 'planner' ? `/planner/${sub}` : `/${top}`;
        window.history.replaceState(null, '', path);
        return;
      }

      // 5. Default / Fallback — restore from session or use defaults
      const storedTop = sessionStorage.getItem('sf_tab') as TopLevelTab | null;
      const storedSub = sessionStorage.getItem('sf_sub') as MainTab | null;
      const storedCodexItem = sessionStorage.getItem('sf_codex_item');
      
      const resolvedTop = (storedTop && ['planner', 'save_map', 'world_map', 'codex'].includes(storedTop)) ? storedTop : 'planner';
      const resolvedSub = (storedSub && ['network_graph', 'tree_list', 'items', 'buildings'].includes(storedSub)) ? storedSub : 'network_graph';
      const resolvedCodexItem = resolvedTop === 'codex' ? (storedCodexItem || null) : null;
      
      setTopLevelTab(resolvedTop);
      setMainTab(resolvedSub);
      setSelectedCodexItemId(resolvedCodexItem);
      
      // Update pathname in address bar on initial load
      const initialPath = resolvedTop === 'planner' ? `/planner/${resolvedSub}` : (resolvedCodexItem ? `/codex/${resolvedCodexItem}` : `/${resolvedTop}`);
      window.history.replaceState(null, '', initialPath);
    } catch (err) {
      console.warn('Failed to parse navigation from URL', err);
    }
  }, []);

  // Sync state with URL on mount and listen to popstate (browser back/forward navigation)
  useEffect(() => {
    parseAndApplyRoute();

    window.addEventListener('popstate', parseAndApplyRoute);
    return () => {
      window.removeEventListener('popstate', parseAndApplyRoute);
    };
  }, [parseAndApplyRoute]);

  const generateShareLink = useCallback(() => {
    const payload = {
      i: lastInput.itemId,
      r: lastInput.rate,
      m: lastInput.minerId,
      b: lastInput.beltId,
      ar: lastInput.recipeSelections,
      l: layoutMode,
      t: topLevelTab,
      s: mainTab,
    };

    const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
    const url = `${window.location.origin}${window.location.pathname}#plan=${encoded}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [lastInput, layoutMode, topLevelTab, mainTab]);

  const calculatePlan = (itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections: RecipeSelectionMap, mode: LayoutMode) => {
    setLastInput({ itemId, rate, minerId, beltId, recipeSelections });
    try {
      setError(null);
      const solvedRoot = solve(itemId, rate, minerId, recipeSelections);
      const newSummary = calculateSummary(solvedRoot);
      const { nodes: newNodes, edges: newEdges } = mapSolverResultToGraph(solvedRoot, mode, beltId);

      // Integrate Diagnostics overlay directly on the ReactFlow graph
      const diag = aggregateDiagnosticsFlowA(solvedRoot, newSummary, beltId);
      const enrichedNodes = newNodes.map(node => {
        const item = node.data.itemId as string;
        if (item && diag.faultyMachineIds.has(item)) {
          return {
            ...node,
            data: {
              ...node.data,
              diagnosticsStatus: diag.faultyMachineIds.get(item),
              diagnosticsSeverity: 'warning',
            }
          };
        }
        return node;
      });

      setRootNode(solvedRoot);
      setSummary(newSummary);
      setNodes(enrichedNodes);
      setEdges(newEdges);

    } catch (err: any) {
      setError(err.message || 'An error occurred during calculation.');
      setRootNode(null);
      setSummary(null);
      setNodes([]);
      setEdges([]);
    }
  };

  // Run calculation strictly when requested
  const handleCalculate = (itemId: string, rate: number, minerId: MachineId, beltId: BeltId, recipeSelections: RecipeSelectionMap) => {
    calculatePlan(itemId, rate, minerId, beltId, recipeSelections, layoutMode);
  };

  const handleResolveAction = useCallback((actionType: string, payload: any) => {
    if (actionType === 'upgrade_belt') {
      const { targetBeltId } = payload;
      setLastInput(prev => ({
        ...prev,
        beltId: targetBeltId,
      }));
    }
  }, []);

  const recipeSelectionSignature = JSON.stringify(lastInput.recipeSelections);

  // Step 1: Immediately show the spinner when inputs or mode change
  useEffect(() => {
    setIsRecalculating(true);
  }, [layoutMode, lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, recipeSelectionSignature]);

  // Step 2: Defer heavy graph calculations to the next tick (80ms), allowing the spinner to render and animate smoothly first!
  useEffect(() => {
    if (!isRecalculating) return;
    const timer = setTimeout(() => {
      calculatePlan(lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, lastInput.recipeSelections, layoutMode);
      setIsRecalculating(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [isRecalculating, layoutMode, lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, recipeSelectionSignature]);


  const renderTabContent = () => {
    if (error) {
      return (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 m-4 text-red-200 z-10 md:mt-20 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-200 hover:text-red-100 transition-colors"
              aria-label="Close error message"
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    switch (mainTab) {
      case 'network_graph':
        return (
          <div
            ref={graphContainerRef}
            className={`w-full h-full bg-[#101114] text-white relative ${
              isGraphFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
            }`}
          >
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => setLayoutMode('aggregated')}
                disabled={isRecalculating}
                className={`${layoutMode === 'aggregated' ? 'sf-primary-btn' : 'sf-secondary-btn'} px-4 py-2 text-[10px] font-bold tracking-widest uppercase disabled:opacity-50`}
                aria-label="Switch to aggregated view"
              >
                {layoutMode === 'aggregated' && <span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" />}
                <span className="relative z-20">Aggregated View</span>
              </button>
              <button
                onClick={() => setLayoutMode('expanded')}
                disabled={isRecalculating}
                className={`${layoutMode === 'expanded' ? 'sf-primary-btn' : 'sf-secondary-btn'} px-4 py-2 text-[10px] font-bold tracking-widest uppercase disabled:opacity-50`}
                aria-label="Switch to machine view"
              >
                {layoutMode === 'expanded' && <span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" />}
                <span className="relative z-20">Machine View</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="sf-secondary-btn px-4 py-2 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5"
                aria-label={isGraphFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <span className="relative z-20 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    {isGraphFullscreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L3 3m0 0l6-6M3 3v6M15 9l6-6m0 0l-6-6m6 6v6M9 15l-6 6m0 0l6 6m-6-6v-6M15 15l6 6m0 0l-6 6m6-6v-6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                    )}
                  </svg>
                  {isGraphFullscreen ? 'Exit' : 'Fullscreen'}
                </span>
              </button>
            </div>
            {isRecalculating && (
              <div className="graph-loading-overlay">
                <div className="graph-loading-spinner" />
                <span className="text-sm text-[#8E9299] font-medium">Building graph layout…</span>
              </div>
            )}
            <div className="w-full h-full">
              <FactoryGraph initialNodes={nodes} initialEdges={edges} beltId={lastInput.beltId} />
            </div>
          </div>
        );
      case 'tree_list':
        return <TreeList rootNode={rootNode} summary={summary} />;
      case 'items':
        return <ItemsTab summary={summary} />;
      case 'buildings':
        return <BuildingsTab summary={summary} />;
      case 'diagnostics':
        return (
          <DiagnosticsTab
            rootNode={rootNode}
            summary={summary}
            activeBeltTier={lastInput.beltId}
            parsedSave={parsedSave}
            onSaveUploaded={(save) => setParsedSave(save)}
            onResolveAction={handleResolveAction}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e4e3e0] flex flex-col font-sans overflow-y-auto">
      <HeaderNav
        topLevelTab={topLevelTab}
        handleTopLevelTab={handleTopLevelTab}
        generateShareLink={generateShareLink}
        copied={copied}
      />
      <div className="flex-grow flex flex-col w-full">
        <BodyFrame>
          {topLevelTab === 'planner' ? (
            <main className="w-full flex flex-col gap-4 p-4">
              
              {/* Top Side: Settings & Summary — collapsible */}
              <div
                className="relative flex flex-col xl:flex-row gap-2 shrink-0 z-20 w-full transition-all duration-300"
                style={{
                  maxHeight: controlsCollapsed ? '0px' : '500px',
                  opacity: controlsCollapsed ? 0 : 1,
                  overflow: controlsCollapsed ? 'hidden' : 'visible'
                }}
              >
                <div className="flex-1 min-w-[50%]">
                  <InputForm onCalculate={handleCalculate} initialValues={lastInput} />
                </div>
                {summary && (
                  <div className="flex-1 min-w-[30%]">
                    <Summary summary={summary} />
                  </div>
                )}
              </div>

              {/* Bottom Side: Main Area */}
              <div
                className="flex flex-col h-[600px] shrink-0 relative sf-blueprint-bg overflow-hidden text-white"
                style={{
                  border: '1px solid #2a2d33',
                  clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.04)',
                }}
              >
                {/* Corner accent – top-left chamfer highlight */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: 0, height: 0,
                  borderTop: '16px solid #f48721', borderRight: '16px solid transparent',
                  zIndex: 30,
                  pointerEvents: 'none',
                }} />

                {/* 4-Tab Navigation Bar with collapse toggle */}
                <div className="tab-bar">
                  {TAB_CONFIG.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleMainTab(tab.id as MainTab)}
                      className={`tab-bar-btn ${mainTab === tab.id ? 'tab-bar-btn--active' : ''}`}
                      aria-label={`View ${tab.label}`}
                      aria-current={mainTab === tab.id ? 'page' : undefined}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                  {/* Collapse toggle — lives at the far right of the tab bar */}
                  <button
                    onClick={() => setControlsCollapsed(v => !v)}
                    className="ml-auto px-3 py-1 text-[#8E9299] hover:text-white transition-colors flex items-center gap-1 text-xs font-mono shrink-0"
                    title={controlsCollapsed ? 'Show controls' : 'Hide controls'}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: controlsCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    {controlsCollapsed ? 'Controls' : 'Hide'}
                  </button>
                </div>

                {/* Tab Content — occupies all available vertical height so ReactFlow expands dynamically */}
                <div className="relative overflow-hidden flex-1 min-h-0">
                  {renderTabContent()}
                </div>

                {/* Bottom edge accent */}
                <div style={{
                  position: 'absolute', bottom: 0, right: 16, left: 0, height: '1px',
                  background: 'linear-gradient(90deg, transparent, #2a2d33 40%)',
                  pointerEvents: 'none',
                  zIndex: 30,
                }} />
                {/* Bottom-right chamfer highlight */}
                <div style={{
                  position: 'absolute', bottom: 0, right: 0, width: 0, height: 0,
                  borderBottom: '16px solid #f4872120', borderLeft: '16px solid transparent',
                  pointerEvents: 'none',
                  zIndex: 30,
                }} />
              </div>

              {/* Separate Diagnostics Dashboard below the blueprint main area */}
              {mainTab === 'network_graph' && !isGraphFullscreen && (
                <div className="w-full relative bg-[#0b0c0e] rounded-xl border border-[#2a2d33] overflow-hidden shadow-lg transition-all duration-300">
                  <DiagnosticsTab
                    rootNode={rootNode}
                    summary={summary}
                    activeBeltTier={lastInput.beltId}
                    parsedSave={parsedSave}
                    onSaveUploaded={(save) => setParsedSave(save)}
                    onResolveAction={handleResolveAction}
                  />
                </div>
              )}
            </main>
          ) : topLevelTab === 'codex' ? (
            <main className="flex flex-col w-full h-full relative sf-blueprint-bg overflow-hidden">
              <ItemBrowser
                selectedItemId={selectedCodexItemId}
                setSelectedItemId={(itemId) => {
                  setSelectedCodexItemId(itemId);
                  updatePath('codex', mainTab, itemId);
                }}
              />
            </main>
          ) : topLevelTab === 'save_map' ? (
            <main className="flex flex-col w-full h-full relative sf-blueprint-bg overflow-hidden">
              <MapTab
                parsedSave={parsedSave}
                onParsed={(save) => setParsedSave(save)}
                onClearSave={() => setParsedSave(null)}
              />
            </main>

          ) : (
            <main className="flex flex-col w-full h-full relative sf-blueprint-bg overflow-hidden">
              <WorldMapTab />
            </main>
          )}
        </BodyFrame>
      </div>
    </div>
  );
}
