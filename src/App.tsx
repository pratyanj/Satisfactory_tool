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
import { solve, calculateSummary, SummaryData, SolverNode } from './engine/solver';
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
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
  },
  {
    id: 'tree_list',
    label: 'Tree list',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'items',
    label: 'Items',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'buildings',
    label: 'Buildings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
        <path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/>
        <path d="M8 10h.01"/><path d="M8 14h.01"/>
      </svg>
    ),
  },
];

type TopLevelTab = 'planner' | 'map';

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [rootNode, setRootNode] = useState<SolverNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [lastInput, setLastInput] = useState<{itemId: string, rate: number, minerId: MachineId, beltId: BeltId}>({ itemId: 'copper_sheet', rate: 120, minerId: 'miner_mk1', beltId: 'mk1' });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('aggregated');
  const [mainTab, setMainTab] = useState<MainTab>('network_graph');
  const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>('planner');
  
  const [copied, setCopied] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Parse URL Hash on mount
  useEffect(() => {
    try {
      if (window.location.hash.startsWith('#plan=')) {
        const encoded = window.location.hash.replace('#plan=', '');
        const decoded = JSON.parse(atob(decodeURIComponent(encoded)));
        
        // Basic validation
        if (decoded.i && items[decoded.i] && typeof decoded.r === 'number' && decoded.m && machines[decoded.m] && decoded.b && belts[decoded.b] && (decoded.l === 'aggregated' || decoded.l === 'expanded')) {
           setLastInput({ itemId: decoded.i, rate: decoded.r, minerId: decoded.m, beltId: decoded.b });
           setLayoutMode(decoded.l);
        }
      }
    } catch (err) {
      console.warn("Failed to parse plan from URL", err);
    }
  }, []);

  const generateShareLink = useCallback(() => {
    const payload = {
      i: lastInput.itemId,
      r: lastInput.rate,
      m: lastInput.minerId,
      b: lastInput.beltId,
      l: layoutMode
    };
    
    const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
    const url = `${window.location.origin}${window.location.pathname}#plan=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [lastInput, layoutMode]);

  const calculatePlan = (itemId: string, rate: number, minerId: MachineId, beltId: BeltId, mode: LayoutMode) => {
    setLastInput({ itemId, rate, minerId, beltId });
    try {
      setError(null);
      const solvedRoot = solve(itemId, rate, minerId);
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
  const handleCalculate = (itemId: string, rate: number, minerId: MachineId, beltId: BeltId) => {
    calculatePlan(itemId, rate, minerId, beltId, layoutMode);
  };

  useEffect(() => {
    // Show spinner first, then defer the heavy computation
    setIsRecalculating(true);
    requestAnimationFrame(() => {
      calculatePlan(lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, layoutMode);
      setIsRecalculating(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode]);

  const renderTabContent = () => {
    if (error) {
      return (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 m-4 text-red-200 z-10 md:mt-20 relative">
          {error}
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'aggregated' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'} disabled:opacity-50`}
              >
                Aggregated View
              </button>
              <button 
                onClick={() => setLayoutMode('expanded')}
                disabled={isRecalculating}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'expanded' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'} disabled:opacity-50`}
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
    <div className="min-h-screen bg-[#050505] text-[#e4e3e0] flex flex-col font-sans p-4 md:p-8 gap-6">
      
      <header className="flex justify-between items-center gap-4 shrink-0">
        <div className="flex flex-col gap-1 w-[250px]">
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">🏗️</span>
            Factory Visual Planner
          </h1>
          <p className="text-[#8E9299]">Plan and optimize your production lines effortlessly.</p>
        </div>
        
        {/* Top Level Navigation */}
        <div className="flex bg-[#1c1e22] rounded-xl p-1.5 border border-[#2a2d33] shadow-lg">
          <button 
            onClick={() => setTopLevelTab('planner')} 
            className={`px-8 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${topLevelTab === 'planner' ? 'bg-[#2a2d33] text-white shadow-md' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Production Planner
          </button>
          <button 
            onClick={() => setTopLevelTab('map')} 
            className={`px-8 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${topLevelTab === 'map' ? 'bg-[#2a2d33] text-white shadow-md' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Interactive Map
          </button>
        </div>

        <div className="flex justify-end w-[250px]">
          {topLevelTab === 'planner' && (
            <button 
              onClick={generateShareLink}
              className="bg-[#1c1e22] hover:bg-[#2a2d33] border border-[#2a2d33] hover:border-[#4a4d53] transition-all text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                  Share Plan
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {topLevelTab === 'planner' ? (
        <main className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Left Side: Main Area */}
          <div className="flex flex-col h-full h-[600px] lg:h-auto min-h-0 relative rounded-2xl bg-[#0d0e11] border border-[#2a2d33] overflow-hidden">
            {/* 4-Tab Navigation Bar */}
            <div className="tab-bar">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id as MainTab)}
                  className={`tab-bar-btn ${mainTab === tab.id ? 'tab-bar-btn--active' : ''}`}
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
          <div className="flex flex-col gap-6 overflow-y-auto min-h-0 pb-10">
            <InputForm onCalculate={handleCalculate} initialValues={lastInput} />
            {summary && <Summary summary={summary} />}
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full mx-auto relative rounded-2xl bg-[#0d0e11] border border-[#2a2d33] overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <MapTab />
        </main>
      )}

    </div>
  );
}
