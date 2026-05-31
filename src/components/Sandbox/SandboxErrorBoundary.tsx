/**
 * FICSIT Sandbox — Error Boundary
 *
 * Catches JavaScript runtime exceptions in the canvas, rendering a premium
 * FICSIT industrial recovery terminal. Allows downloading the last-persisted layout
 * from localStorage so no design work is lost, copying error logs, and resetting the sub-grid.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SandboxErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    // Crash logging to console
    console.error('[FICSIT Sandbox Crash] Diagnostic Log:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
    
    // Store last crash in localStorage for recovery diagnostics
    try {
      localStorage.setItem('ficsit_sandbox_last_crash', JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      // Ignored
    }
  }

  private handleExportBackup = () => {
    try {
      const raw = localStorage.getItem('ficsit_sandbox_v1');
      if (!raw) {
        alert('FICSIT Notice: No layout recovery data was found in local storage.');
        return;
      }
      
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficsit_sandbox_recovery_${Math.round(Date.now() / 1000)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('FICSIT Error: Failed to salvage layout.');
    }
  };

  private handleResetSubGrid = () => {
    if (
      window.confirm(
        'WARNING: You are about to completely wipe the FICSIT Sandbox sub-grid layout.\n\nAll placed machines, belts, and power lines will be destroyed. This action cannot be undone.\n\nDo you wish to proceed?'
      )
    ) {
      try {
        localStorage.removeItem('ficsit_sandbox_v1');
        window.location.reload();
      } catch (e) {
        window.location.reload();
      }
    }
  };

  private handleCopyToClipboard = () => {
    if (!this.state.error) return;
    const log = `FICSIT Sandbox Crash Log\nTimestamp: ${new Date().toISOString()}\n\nError: ${this.state.error.toString()}\n\nStack:\n${this.state.error.stack || 'N/A'}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`;
    
    navigator.clipboard.writeText(log).then(() => {
      alert('Diagnostic report copied to clipboard.');
    }).catch(() => {
      alert('Failed to copy to clipboard.');
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="sandbox-error-container">
          <div className="sandbox-error-card">
            {/* FICSIT Hazard Striping */}
            <div className="sandbox-error-hazard-bar" />

            <div className="sandbox-error-header">
              <svg className="sandbox-error-icon animate-pulse" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f48721" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h2 className="sandbox-error-title">CRITICAL GRID COLLAPSE DETECTED</h2>
            </div>

            <p className="sandbox-error-message">
              FICSIT sub-grid simulation encountered an unexpected manufacturing exception. 
              Pioneers are legally requested to salvage their layout data and report the diagnostic logs 
              to FICSIT Central Command.
            </p>

            {/* Error Detail Console */}
            <div className="sandbox-error-console">
              <div className="sandbox-console-header">
                <span>TERMINAL://DIAGNOSTIC_REPORT</span>
                <span className="sandbox-console-status">STATUS: FAULT</span>
              </div>
              <div className="sandbox-console-body">
                <div className="sandbox-console-line error-line">
                  <strong>EXCEPTION:</strong> {this.state.error?.toString()}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="sandbox-console-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
                {this.state.error?.stack && (
                  <pre className="sandbox-console-stack">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </div>

            {/* Recovery Actions */}
            <div className="sandbox-error-actions">
              <button
                type="button"
                className="sf-primary-btn px-4 py-2 text-[11px] font-bold tracking-widest uppercase relative"
                onClick={() => window.location.reload()}
              >
                <span className="sf-btn-scanner absolute inset-0 pointer-events-none z-10" />
                <span className="relative z-20">Re-initialize Simulation</span>
              </button>

              <button
                type="button"
                className="sf-secondary-btn px-4 py-2 text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5"
                onClick={this.handleExportBackup}
                title="Saves your layout as a JSON file from local storage"
              >
                <span>💾 Salvage Layout Data</span>
              </button>

              <button
                type="button"
                className="sf-secondary-btn px-4 py-2 text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5"
                onClick={this.handleCopyToClipboard}
              >
                <span>📋 Copy Logs</span>
              </button>

              <button
                type="button"
                className="sf-danger-btn px-4 py-2 text-[11px] font-bold tracking-widest uppercase text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                onClick={this.handleResetSubGrid}
              >
                <span>⚠️ Emergency Wipe</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
