/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { solve, calculateSummary, SummaryData, SolverNode, RecipeSelectionMap } from './engine/solver';
import { mapSolverResultToGraph, LayoutMode } from './engine/graphMapper';
import { BeltId, MachineId, items, machines, belts } from './engine/data';
import { Edge, Node } from '@xyflow/react';

type MainTab = 'network_graph' | 'tree_list' | 'items' | 'buildings' | 'world_map';

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

  const [lastInput, setLastInput] = useState<{ itemId: string, rate: number, minerId: MachineId, beltId: BeltId }>({ itemId: 'copper_sheet', rate: 120, minerId: 'miner_mk1', beltId: 'mk1' });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('aggregated');
  const [mainTab, setMainTab] = useState<MainTab>('network_graph');
  const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>('planner');

  const [copied, setCopied] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Sync URL hash whenever navigation state changes
  const updateHash = useCallback((top: TopLevelTab, sub: MainTab) => {
    const hash = `#tab=${top}&sub=${sub}`;
    window.history.replaceState(null, '', hash);
    sessionStorage.setItem('sf_tab', top);
    sessionStorage.setItem('sf_sub', sub);
  }, []);

  const handleTopLevelTab = useCallback((tab: TopLevelTab) => {
    setTopLevelTab(tab);
    updateHash(tab, mainTab);
  }, [mainTab, updateHash]);

  const handleMainTab = useCallback((tab: MainTab) => {
    setMainTab(tab);
    updateHash(topLevelTab, tab);
  }, [topLevelTab, updateHash]);

  // Parse URL Hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    try {
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
        }
        return;
      }

      if (hash.startsWith('#tab=')) {
        const params = new URLSearchParams(hash.slice(1));
        const top = (params.get('tab') ?? '') as TopLevelTab;
        const sub = (params.get('sub') ?? '') as MainTab;
        if (['planner', 'save_map', 'world_map'].includes(top)) setTopLevelTab(top);
        if (['network_graph', 'tree_list', 'items', 'buildings'].includes(sub)) setMainTab(sub);
        return;
      }

      // No hash — restore from session
      const storedTop = sessionStorage.getItem('sf_tab') as TopLevelTab | null;
      const storedSub = sessionStorage.getItem('sf_sub') as MainTab | null;
      const resolvedTop = (storedTop && ['planner', 'save_map', 'world_map', 'codex'].includes(storedTop)) ? storedTop : 'planner';
      const resolvedSub = (storedSub && ['network_graph', 'tree_list', 'items', 'buildings'].includes(storedSub)) ? storedSub : 'network_graph';
      setTopLevelTab(resolvedTop);
      setMainTab(resolvedSub);
      window.history.replaceState(null, '', `tab=${resolvedTop}&sub=${resolvedSub}`);
    } catch (err) {
      console.warn('Failed to parse navigation from URL', err);
    }
  }, []);

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

      setRootNode(solvedRoot);
      setSummary(newSummary);
      setNodes(newNodes);
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

  const recipeSelectionSignature = JSON.stringify(lastInput.recipeSelections);

  // FIXED: Issue #3 - Added all dependencies to prevent stale closures
  useEffect(() => {
    // Show spinner first, then defer the heavy computation
    setIsRecalculating(true);
    requestAnimationFrame(() => {
      calculatePlan(lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, lastInput.recipeSelections, layoutMode);
      setIsRecalculating(false);
    });
  }, [layoutMode, lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, recipeSelectionSignature]);

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
          <div className="w-full h-full">
            <div className="absolute top-4 right-4 z-10 flex bg-[#1c1e22] rounded-lg border border-[#2a2d33] p-1 shadow-xl">
              <button
                onClick={() => setLayoutMode('aggregated')}
                disabled={isRecalculating}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'aggregated' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#242528]'} disabled:opacity-50`}
                aria-label="Switch to aggregated view"
              >
                Aggregated View
              </button>
              <button
                onClick={() => setLayoutMode('expanded')}
                disabled={isRecalculating}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'expanded' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#242528]'} disabled:opacity-50`}
                aria-label="Switch to machine view"
              >
                Machine View
              </button>
            </div>
            {isRecalculating && (
              <div className="graph-loading-overlay">
                <div className="graph-loading-spinner" />
                <span className="text-sm text-[#8E9299] font-medium">Building graph layout…</span>
              </div>
            )}
            <FactoryGraph initialNodes={nodes} initialEdges={edges} beltId={lastInput.beltId} />
          </div>
        );
      case 'tree_list':
        return <TreeList rootNode={rootNode} summary={summary} />;
      case 'items':
        return <ItemsTab summary={summary} />;
      case 'buildings':
        return <BuildingsTab summary={summary} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e4e3e0] flex flex-col font-sans">
      <HeaderNav
        topLevelTab={topLevelTab}
        handleTopLevelTab={handleTopLevelTab}
        generateShareLink={generateShareLink}
        copied={copied}
      />
      <div className="flex-1 overflow-hidden flex flex-col w-full h-full">
        <BodyFrame>
          {topLevelTab === 'planner' ? (
            <main className="flex-1 w-full h-full grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 p-4 md:p-4 min-h-0">
              {/* Left Side: Main Area */}
              <div className="flex flex-col h-full h-[600px] lg:h-auto min-h-0 relative rounded-2xl sf-blueprint-bg overflow-hidden border border-[#2a2d33]">
                {/* 4-Tab Navigation Bar */}
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
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-0 relative overflow-hidden">
                  {renderTabContent()}
                </div>
              </div>

              {/* Right Side: Sidebar */}
              <div className="flex flex-col gap-6 overflow-y-auto min-h-0 pr-2">
                <InputForm onCalculate={handleCalculate} initialValues={lastInput} />
                {summary && <Summary summary={summary} />}
              </div>
            </main>
          ) : topLevelTab === 'codex' ? (
            <main className="flex flex-col w-full h-full relative sf-blueprint-bg overflow-hidden">
              <ItemBrowser />
            </main>
          ) : topLevelTab === 'save_map' ? (
            <main className="flex flex-col w-full h-full relative sf-blueprint-bg overflow-hidden">
              <MapTab />
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
