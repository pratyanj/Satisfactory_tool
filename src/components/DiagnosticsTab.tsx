import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ParsedSave } from '../types/save';
import type { SolverNode, SummaryData } from '../engine/solver';
import { 
  aggregateDiagnosticsFlowA, 
  aggregateDiagnosticsFlowB 
} from '../engine/diagnostics/diagnosticsAggregator';
import { DiagnosticIssue, SuggestedFix } from '../engine/diagnostics/types';
import { parseSaveFile, ParseProgress } from '../engine/saveParser';
import { AppImage } from './AppImage';
import { items } from '../engine/data';
import { 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Cpu, 
  Zap, 
  GitMerge, 
  TrendingDown, 
  ShieldAlert, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface DiagnosticsTabProps {
  rootNode: SolverNode | null;
  summary: SummaryData | null;
  activeBeltTier: string;
  activePipeTier?: 'mk1' | 'mk2';
  parsedSave: ParsedSave | null;
  onSaveUploaded: (save: ParsedSave) => void;
  onResolveAction?: (actionType: string, payload: any) => void;
}

type DiagnosticsMode = 'theoretical' | 'real';
type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type CategoryFilter = 'all' | 'belt' | 'pipe' | 'machine' | 'power' | 'train';

export function DiagnosticsTab({
  rootNode,
  summary,
  activeBeltTier,
  activePipeTier = 'mk1',
  parsedSave,
  onSaveUploaded,
  onResolveAction,
}: DiagnosticsTabProps) {
  const [mode, setMode] = useState<DiagnosticsMode>('theoretical');
  
  // Filtering states
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  
  // Interactive fixes resolution tracking
  const [resolvedFixes, setResolvedFixes] = useState<Set<string>>(new Set());

  // Save parser states for internal upload
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute diagnostics depending on mode
  const diagnostics = useMemo(() => {
    if (mode === 'theoretical') {
      if (!rootNode || !summary) return null;
      return aggregateDiagnosticsFlowA(rootNode, summary, activeBeltTier, activePipeTier);
    } else {
      if (!parsedSave) return null;
      return aggregateDiagnosticsFlowB(parsedSave);
    }
  }, [mode, rootNode, summary, activeBeltTier, activePipeTier, parsedSave]);

  // Adjust health score dynamically based on resolved fixes!
  const adjustedHealthScore = useMemo(() => {
    if (!diagnostics) return 0;
    const baseScore = diagnostics.healthScore;
    if (resolvedFixes.size === 0) return baseScore;
    
    // Add points for resolved fixes
    const bonus = Math.min(100 - baseScore, resolvedFixes.size * 6);
    return Math.round(baseScore + bonus);
  }, [diagnostics, resolvedFixes]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (!diagnostics) return [];
    return diagnostics.issues.filter(issue => {
      const matchSeverity = severityFilter === 'all' || issue.severity === severityFilter;
      const matchCategory = categoryFilter === 'all' || issue.category === categoryFilter;
      return matchSeverity && matchCategory;
    });
  }, [diagnostics, severityFilter, categoryFilter]);

  const handleToggleFix = (fixId: string) => {
    setResolvedFixes(prev => {
      const next = new Set(prev);
      if (next.has(fixId)) {
        next.delete(fixId);
      } else {
        next.add(fixId);
      }
      return next;
    });
  };

  // Drag and drop save parser direct inside Diagnostics Dashboard
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.sav')) {
      setUploadError('Please upload a valid Satisfactory save file (.sav)');
      return;
    }

    setUploadError(null);
    setIsParsing(true);
    setProgress({ progress: 0, message: 'Reading save…' });

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseSaveFile(file.name.replace('.sav', ''), buffer, (p) => {
        setProgress(p);
      });
      setProgress({ progress: 1, message: 'Done!' });
      setTimeout(() => {
        setIsParsing(false);
        setProgress(null);
        onSaveUploaded(result);
      }, 500);
    } catch (err: any) {
      setUploadError(err?.message ?? 'Failed to parse save file.');
      setIsParsing(false);
      setProgress(null);
    }
  }, [onSaveUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Render score color mapping
  const getScoreColor = (score: number) => {
    if (score >= 85) return '#00E676'; // FICSIT Green
    if (score >= 50) return '#FF9100'; // FICSIT Yellow/Orange
    return '#FF1744'; // Alert Red
  };

  return (
    <div className="relative w-full flex flex-col bg-[#0b0c0e] text-[#e4e3e0] p-4 box-border">
      {/* Component Styles */}
      <style>{`
        .ficsit-hazard-bar {
          background: repeating-linear-gradient(
            -45deg,
            #f48721,
            #f48721 10px,
            #111 10px,
            #111 20px
          );
          height: 8px;
          width: 100%;
          border-radius: 4px;
        }
        .glowing-circle {
          transition: stroke-dashoffset 0.8s ease-out;
        }
        .issue-card {
          background: linear-gradient(135deg, #121418 0%, #0d0e11 100%);
          border: 1px solid #23262e;
          box-shadow: 0 4px 15px rgba(0,0,0,0.4);
          transition: transform 0.2s, border-color 0.2s;
        }
        .issue-card:hover {
          transform: translateY(-2px);
          border-color: #f48721;
        }
        .gauge-metric {
          background: #111317;
          border: 1px solid #20232a;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
        }
        .ficsit-btn-active {
          background: #f48721 !important;
          color: black !important;
          font-weight: 800;
          box-shadow: 0 0 10px rgba(244, 135, 33, 0.4);
        }
        .pulse-red {
          animation: pulseRed 2s infinite;
        }
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 23, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0); }
        }
        .ficsit-terminal-title {
          font-family: 'Courier New', Courier, monospace;
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#101216] border border-[#22252c] rounded-xl p-4 mb-4 gap-4 shadow-md relative overflow-hidden shrink-0">
        {/* Flashing top border caution */}
        <div className="absolute top-0 left-0 right-0 ficsit-hazard-bar" />
        
        <div className="mt-2">
          <span className="text-[9px] font-black tracking-widest text-[#f48721] uppercase block ficsit-terminal-title">
            FICSIT INC. FACTORY MONITORING & UTILITIES
          </span>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#f48721] animate-pulse" />
            FACTORY DIAGNOSTICS & BOTTLENECK ANALYSIS
          </h1>
        </div>

        {/* Toggle Mode slider */}
        <div className="flex bg-[#08090a] p-1 rounded-lg border border-[#252831] relative z-10">
          <button
            onClick={() => setMode('theoretical')}
            className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all duration-300 ${
              mode === 'theoretical' ? 'ficsit-btn-active' : 'text-[#8E9299] hover:text-white'
            }`}
          >
            Theoretical Plan
          </button>
          <button
            onClick={() => setMode('real')}
            className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all duration-300 ${
              mode === 'real' ? 'ficsit-btn-active' : 'text-[#8E9299] hover:text-white'
            }`}
          >
            Real Save File (.sav)
          </button>
        </div>
      </div>

      {/* RENDER MODE CHECKS */}
      {mode === 'theoretical' && (!rootNode || !summary) ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#2c2f38] rounded-2xl p-12 text-center bg-[#111318]/50">
          <AlertTriangle className="w-12 h-12 text-[#FF9100] mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">No Active Production Plan</h2>
          <p className="text-sm text-[#8E9299] max-w-md">
            Theoretical analysis requires an active production chain. Navigate to the **Planner Input Controls** above, select a target item and speed, and click **Calculate Plan**.
          </p>
        </div>
      ) : mode === 'real' && !parsedSave ? (
        /* Flow B: Save file diagnostics drag zone */
        <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[#343946] rounded-2xl bg-[#111318]/30">
          <div className="max-w-md w-full text-center">
            <FolderOpen className="w-12 h-12 text-[#f48721] mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
              REAL SAVE DIAGNOSTICS
            </h2>
            <p className="text-sm text-[#8E9299] mb-6">
              Provide your Satisfactory save file (`.sav`) to simulated fluid lines, locate belt overloads, and audit power grids.
            </p>

            <div
              className={`p-10 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                isDragging ? 'border-[#f48721] bg-[#f48721]/10' : 'border-[#2d323e] bg-[#0c0d10]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !isParsing && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".sav"
                className="hidden"
                onChange={onFileChange}
              />
              
              {isParsing && progress ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-8 h-8 text-[#f48721] animate-spin mb-4" />
                  <div className="w-full h-2 bg-[#1a1c22] rounded overflow-hidden mb-2">
                    <div 
                      className="h-full bg-[#f48721]" 
                      style={{ width: `${Math.round(progress.progress * 100)}%` }} 
                    />
                  </div>
                  <span className="text-xs font-bold text-white">{progress.message} ({Math.round(progress.progress * 100)}%)</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-white">Drag & drop your save file here</p>
                  <p className="text-xs text-[#8E9299] mt-1">or click to browse local files</p>
                  <div className="mt-4 text-[10px] font-mono text-[#6c7280] bg-[#14161d] p-2 rounded">
                    %LOCALAPPDATA%\FactoryGame\Saved\SaveGames
                  </div>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 text-xs font-bold text-[#FF1744] bg-[#FF1744]/10 p-3 border border-[#FF1744]/20 rounded-lg">
                ⚠️ {uploadError}
              </div>
            )}
          </div>
        </div>
      ) : diagnostics ? (
        /* MAIN DASHBOARD RENDER */
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Main Grid: Score, Sub-Metrics, Production Loss */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Health Score Card */}
            <div className="issue-card rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-[10px] font-black tracking-widest text-[#8e929a] uppercase absolute top-4 left-4 ficsit-terminal-title">
                Unified Health Score
              </span>
              
              {/* Circular Gauge */}
              <div className="relative w-40 h-40 flex items-center justify-center mt-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background tracks */}
                  <circle
                    cx="50" cy="50" r="42"
                    fill="transparent"
                    stroke="#1c1e24"
                    strokeWidth="8"
                  />
                  {/* Glowing dynamic score line */}
                  <circle
                    className="glowing-circle"
                    cx="50" cy="50" r="42"
                    fill="transparent"
                    stroke={getScoreColor(adjustedHealthScore)}
                    strokeWidth="8"
                    strokeDasharray={263.8}
                    strokeDashoffset={263.8 - (263.8 * adjustedHealthScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Score Centred Output */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-black font-mono tracking-tighter text-white">
                    {adjustedHealthScore}
                  </span>
                  <span 
                    className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded mt-1"
                    style={{ 
                      background: `${getScoreColor(adjustedHealthScore)}20`,
                      color: getScoreColor(adjustedHealthScore) 
                    }}
                  >
                    {adjustedHealthScore >= 85 ? 'OPTIMAL' : adjustedHealthScore >= 50 ? 'SUB-OPTIMAL' : 'CRITICAL'}
                  </span>
                </div>
              </div>
              
              <p className="text-[11px] text-[#8E9299] text-center mt-3 max-w-[80%] leading-relaxed">
                Calculated based on logistical belt speed integrity, grid power safety reserve, and active machinery uptime.
              </p>
            </div>

            {/* Sub-Metrics details */}
            <div className="issue-card rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-black tracking-widest text-[#8e929a] uppercase ficsit-terminal-title mb-3 block">
                Sub-System Efficiencies
              </span>

              <div className="flex-1 flex flex-col justify-around gap-2.5">
                {/* Logistics */}
                <div>
                  <div className="flex justify-between items-baseline text-xs font-bold mb-1">
                    <span className="text-[#a0a4ab] flex items-center gap-1.5"><GitMerge className="w-3.5 h-3.5" /> Logistics (Belts & Pipes)</span>
                    <span className="text-white font-mono">{diagnostics.metrics.logisticsEfficiency}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#171a22] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${diagnostics.metrics.logisticsEfficiency}%` }} />
                  </div>
                </div>

                {/* Power Stability */}
                <div>
                  <div className="flex justify-between items-baseline text-xs font-bold mb-1">
                    <span className="text-[#a0a4ab] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Power Grid Stability</span>
                    <span className="text-white font-mono">{diagnostics.metrics.powerStability}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#171a22] rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${diagnostics.metrics.powerStability}%` }} />
                  </div>
                </div>

                {/* Machine Uptime */}
                <div>
                  <div className="flex justify-between items-baseline text-xs font-bold mb-1">
                    <span className="text-[#a0a4ab] flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Machinery Output Uptime</span>
                    <span className="text-white font-mono">{diagnostics.metrics.machineUptime}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#171a22] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${diagnostics.metrics.machineUptime}%` }} />
                  </div>
                </div>

                {/* Transport efficiency */}
                <div>
                  <div className="flex justify-between items-baseline text-xs font-bold mb-1">
                    <span className="text-[#a0a4ab] flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> Transport Operations</span>
                    <span className="text-white font-mono">{diagnostics.metrics.transportEfficiency}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#171a22] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${diagnostics.metrics.transportEfficiency}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Production Loss Estimate Card */}
            <div className="issue-card rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black tracking-widest text-[#8e929a] uppercase ficsit-terminal-title mb-3 block">
                  Production Loss Estimate
                </span>

                <div className="flex items-center gap-2 mb-2 bg-[#ff1744]/10 border border-[#ff1744]/25 p-2 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-[#FF1744] shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-[#8e929a] uppercase block">Estimated Net Inefficiency Output Loss</span>
                    <span className="text-lg font-black text-white font-mono">
                      -{diagnostics.estimatedLoss.toFixed(0)} units/min
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-3 overflow-y-auto max-h-36">
                  {diagnostics.productionLosses.map((loss, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#13151b] border border-[#20222a] p-1.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        {loss.imageUrl && (
                          <div className="w-6 h-6 bg-[#0a0b0d] p-0.5 border border-[#20222a] rounded flex items-center justify-center shrink-0">
                            <AppImage idKey={loss.itemId} fallbackUrl={loss.imageUrl} className="w-full h-full object-contain" alt={loss.itemName} />
                          </div>
                        )}
                        <span className="text-[#a0a4ab] font-bold">{loss.itemName}</span>
                      </div>
                      <span className="text-[#FF1744] font-bold font-mono">-{loss.lossRate} {loss.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Grid: Warning Cards list & Suggested Fixes list */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0 flex-1">
            
            {/* LEFT SIDE: Warning Cards List */}
            <div className="xl:col-span-2 flex flex-col bg-[#101216] border border-[#22252c] rounded-xl p-4">
              
              {/* Header filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#252831] pb-3 mb-3 gap-3">
                <span className="text-xs font-black tracking-widest text-[#f48721] uppercase ficsit-terminal-title">
                  Active Warning Cards ({filteredIssues.length})
                </span>

                <div className="flex flex-wrap gap-2">
                  {/* Category filters */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                    className="bg-[#0b0c0e] border border-[#2a2d37] text-white text-[10px] font-bold tracking-wider rounded px-2.5 py-1 uppercase"
                  >
                    <option value="all">Category: All</option>
                    <option value="belt">Conveyor Belts</option>
                    <option value="pipe">Pipelines</option>
                    <option value="machine">Machines</option>
                    <option value="power">Power Grid</option>
                    <option value="train">Transport</option>
                  </select>

                  {/* Severity Filters */}
                  <div className="flex bg-[#0b0c0e] border border-[#2a2d37] rounded p-0.5">
                    {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded transition-colors ${
                          severityFilter === sev 
                            ? sev === 'critical' ? 'bg-[#ff1744] text-white' : sev === 'warning' ? 'bg-[#ff9100] text-black' : sev === 'info' ? 'bg-blue-500 text-white' : 'bg-[#e4e3e0] text-black'
                            : 'text-[#8E9299] hover:text-white'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warnings loop */}
              <div className="flex flex-col gap-2.5 pr-1">
                {filteredIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#8E9299]">
                    <CheckCircle className="w-10 h-10 text-[#00E676] mb-3" />
                    <span className="text-xs font-bold">Diagnostics Clear! No Bottlenecks Detected.</span>
                  </div>
                ) : (
                  filteredIssues.map((issue) => (
                    <div 
                      key={issue.id} 
                      className={`p-3 rounded-lg border flex gap-3 issue-card ${
                        issue.severity === 'critical' 
                          ? 'border-[#ff1744]/30 bg-[#ff1744]/5' 
                          : issue.severity === 'warning' 
                          ? 'border-[#ff9100]/30 bg-[#ff9100]/5' 
                          : 'border-blue-500/30 bg-blue-500/5'
                      }`}
                    >
                      {/* Left Badge icon */}
                      <div 
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          issue.severity === 'critical' 
                            ? 'bg-[#ff1744]/20 border-[#ff1744]/40 text-[#ff1744]' 
                            : issue.severity === 'warning' 
                            ? 'bg-[#ff9100]/20 border-[#ff9100]/40 text-[#ff9100]' 
                            : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                        }`}
                      >
                        {issue.category === 'belt' && <GitMerge className="w-5 h-5" />}
                        {issue.category === 'pipe' && <span className="text-base font-bold">💧</span>}
                        {issue.category === 'machine' && <Cpu className="w-5 h-5" />}
                        {issue.category === 'power' && <Zap className="w-5 h-5" />}
                        {issue.category === 'train' && <span className="text-base">🚂</span>}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{issue.title}</h4>
                          <span 
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              issue.severity === 'critical' 
                                ? 'bg-[#ff1744] text-white' 
                                : issue.severity === 'warning' 
                                ? 'bg-[#ff9100] text-black' 
                                : 'bg-blue-500 text-white'
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-xs text-[#a0a4ab] mt-1.5 leading-relaxed">{issue.description}</p>
                        {issue.suggestedFix && (
                          <div className="mt-2.5 text-[11px] bg-[#0c0d10] border border-[#1f2229] p-2 rounded text-[#FF9100] font-medium leading-relaxed">
                            <span className="font-extrabold text-white block text-[10px] uppercase mb-0.5 ficsit-terminal-title">FICSIT Directives:</span>
                            {issue.suggestedFix}
                          </div>
                        )}
                        {issue.action && onResolveAction && (
                          <button
                            onClick={() => onResolveAction(issue.action!.type, issue.action!.payload)}
                            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#f48721] text-black text-[10px] font-extrabold uppercase tracking-wider hover:bg-[#ff9b3d] hover:shadow-[0_0_10px_rgba(244,135,33,0.5)] active:scale-95 transition-all duration-150 border border-t-[#ffb066] border-b-[#c46200] cursor-pointer"
                          >
                            <span className="text-xs">🔧</span>
                            {issue.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* RIGHT SIDE: Actionable Suggested Fixes */}
            <div className="flex flex-col bg-[#101216] border border-[#22252c] rounded-xl p-4">
              <div className="border-b border-[#252831] pb-3 mb-3">
                <span className="text-xs font-black tracking-widest text-[#f48721] uppercase ficsit-terminal-title">
                  Actionable Fix Directive
                </span>
                <p className="text-[10px] text-[#8E9299] mt-0.5">Click to toggle directives resolution.</p>
              </div>

              <div className="flex flex-col gap-2 pr-1">
                {diagnostics.suggestedFixes.map((fix) => {
                  const isResolved = resolvedFixes.has(fix.id);
                  return (
                    <div
                      key={fix.id}
                      onClick={() => handleToggleFix(fix.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                        isResolved
                          ? 'bg-[#00E676]/5 border-[#00E676]/30 opacity-70'
                          : 'bg-[#14161c] border-[#222631] hover:border-[#f48721]'
                      }`}
                    >
                      {/* Checkbox circle indicator */}
                      <div 
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isResolved 
                            ? 'bg-[#00E676] border-[#00E676] text-black font-extrabold' 
                            : 'border-[#414758]'
                        }`}
                      >
                        {isResolved && '✓'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold text-white ${isResolved ? 'line-through text-[#6e7482]' : ''}`}>
                          {fix.title}
                        </h4>
                        <p className={`text-[11px] text-[#a0a4ab] mt-1 leading-relaxed ${isResolved ? 'line-through text-[#6e7482]' : ''}`}>
                          {fix.description}
                        </p>
                        
                        <div className="flex justify-between items-center mt-2 text-[8.5px] font-black uppercase tracking-wider font-mono">
                          <span className="text-[#8E9299]">System: {fix.category}</span>
                          <span className={isResolved ? 'text-[#6e7482]' : 'text-[#00E676]'}>
                            Impact: {fix.impact}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : null}
    </div>
  );
}
