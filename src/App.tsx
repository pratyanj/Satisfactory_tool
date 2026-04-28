/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { Summary } from './components/Summary';
import { FactoryGraph } from './components/Graph/FactoryGraph';
import { Dashboard } from './components/Dashboard';
import { solve, calculateSummary, SummaryData } from './engine/solver';
import { mapSolverResultToGraph, LayoutMode } from './engine/graphMapper';
import { BeltId, MachineId, items, machines, belts } from './engine/data';
import { Edge, Node } from '@xyflow/react';

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [lastInput, setLastInput] = useState<{itemId: string, rate: number, minerId: MachineId, beltId: BeltId}>({ itemId: 'copper_sheet', rate: 120, minerId: 'miner_mk1', beltId: 'mk1' });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('aggregated');
  const [mainTab, setMainTab] = useState<'graph' | 'dashboard'>('graph');
  
  const [copied, setCopied] = useState(false);

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
      const rootNode = solve(itemId, rate, minerId);
      const newSummary = calculateSummary(rootNode);
      const { nodes: newNodes, edges: newEdges } = mapSolverResultToGraph(rootNode, mode, beltId);

      setSummary(newSummary);
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err: any) {
      setError(err.message || 'An error occurred during calculation.');
      setSummary(null);
      setNodes([]);
      setEdges([]);
    }
  };

  // Run calculation strictly when requested
  // HandleCalculate from input form now triggers the URL state update to naturally be shareable if desired
  const handleCalculate = (itemId: string, rate: number, minerId: MachineId, beltId: BeltId) => {
    calculatePlan(itemId, rate, minerId, beltId, layoutMode);
  };

  useEffect(() => {
    calculatePlan(lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, layoutMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e4e3e0] flex flex-col font-sans p-4 md:p-8 gap-6">
      
      <header className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">🏗️</span>
            Factory Visual Planner
          </h1>
          <p className="text-[#8E9299]">Plan and optimize your production lines effortlessly.</p>
        </div>
        
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
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6" style={{ height: 'calc(100vh - 120px)' }}>
        
        {/* Left Side: Main Area */}
        <div className="flex flex-col h-full h-[600px] lg:h-auto min-h-0 relative rounded-2xl bg-[#0d0e11] border border-[#2a2d33] overflow-hidden">
          
          {/* Main Tab Toggle */}
          <div className="absolute top-4 left-4 z-10 flex bg-[#1c1e22] rounded-lg border border-[#2a2d33] p-1 shadow-xl">
            <button 
              onClick={() => setMainTab('graph')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${mainTab === 'graph' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'}`}
            >
              Visual Graph
            </button>
            <button 
              onClick={() => setMainTab('dashboard')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${mainTab === 'dashboard' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'}`}
            >
              Dashboard Stats
            </button>
          </div>

          {/* Toggle Control Overlay */}
          {mainTab === 'graph' && (
            <div className="absolute top-4 right-4 z-10 flex bg-[#1c1e22] rounded-lg border border-[#2a2d33] p-1 shadow-xl">
              <button 
                onClick={() => setLayoutMode('aggregated')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'aggregated' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'}`}
              >
                Aggregated View
              </button>
              <button 
                onClick={() => setLayoutMode('expanded')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'expanded' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:text-white hover:bg-[#2a2d33]/50'}`}
              >
                Machine View
              </button>
            </div>
          )}

          {error ? (
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 m-4 text-red-200 z-10 md:mt-20 relative">
              {error}
            </div>
          ) : mainTab === 'graph' ? (
            <div className="w-full h-full pt-16">
              <FactoryGraph initialNodes={nodes} initialEdges={edges} />
            </div>
          ) : (
            <div className="w-full h-full pt-16 overflow-hidden">
              <Dashboard summary={summary} />
            </div>
          )}
        </div>

        {/* Right Side: Sidebar */}
        <div className="flex flex-col gap-6 overflow-y-auto min-h-0 pb-10">
          <InputForm onCalculate={handleCalculate} initialValues={lastInput} />
          {summary && <Summary summary={summary} />}
        </div>
        
      </main>

    </div>
  );
}

