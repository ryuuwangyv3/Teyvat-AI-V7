import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, Home, ZapOff } from 'lucide-react';

interface Props { 
  children?: ReactNode;
}

interface State { 
  hasError: boolean; 
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state biar render fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Lo bisa kirim log ini ke Sentry atau service eksternal di sini
    console.error("─── [AKASHA SYSTEM BREACH] ───");
    console.error("Reason:", error.message);
    console.error("Trace:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  handleRejection = (e: PromiseRejectionEvent) => {
    this.setState({ 
      hasError: true, 
      error: e.reason instanceof Error ? e.reason : new Error(String(e.reason)) 
    });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/'; // Balik ke Safe Zone
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0b0e14] text-[#ece5d8] p-4 overflow-hidden font-sans">
          {/* CRT & Scanline Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-0 bg-[length:100%_4px,3px_100%] pointer-events-none" />
          
          {/* Floating Particle "Data Corruption" */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500/20 blur-[100px] animate-pulse" />
             <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-500/20 blur-[120px] animate-pulse delay-700" />
          </div>

          <div className="relative z-10 w-full max-w-md p-8 rounded-[2.5rem] border border-red-500/20 bg-black/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(220,38,38,0.1)] animate-in fade-in zoom-in duration-500">
            
            {/* Header Icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-full animate-pulse" />
              <ZapOff className="relative w-20 h-20 text-red-500 animate-bounce" />
              <AlertTriangle className="absolute -top-1 -right-1 w-8 h-8 text-amber-500 animate-ping opacity-50" />
            </div>
            
            {/* Title Section */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black tracking-[0.3em] uppercase text-white mb-2 relative inline-block group">
                <span className="relative z-10 italic">Neural Breach</span>
                <span className="absolute -inset-1 text-red-500 opacity-40 blur-[2px] group-hover:animate-pulse">Neural Breach</span>
              </h1>
              <p className="text-[10px] text-gray-400 italic uppercase tracking-[0.2em] max-w-[250px] mx-auto leading-relaxed">
                "The Ley Lines are failing. Connection to Irminsul has been compromised."
              </p>
            </div>

            {/* Error Console */}
            <div className="bg-black/40 rounded-2xl border border-white/5 p-5 mb-8 font-mono text-left relative group overflow-hidden">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Fatal_Exception_Log</span>
              </div>
              <div className="max-h-[100px] overflow-y-auto custom-scrollbar">
                <p className="text-red-400 text-xs font-bold mb-2">
                  &gt; {this.state.error?.name || "UnknownAnomaly"}: {this.state.error?.message || "Segmentation Fault"}
                </p>
                {this.state.errorInfo && (
                   <p className="text-[9px] text-gray-600 leading-tight">
                     {this.state.errorInfo.componentStack.split('\n').slice(0, 3).join('\n')}
                   </p>
                )}
              </div>
              <div className="absolute bottom-0 right-0 p-2 opacity-5">
                <Terminal size={40} />
              </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="group relative flex items-center justify-center gap-3 py-4 bg-[#d3bc8e] hover:bg-[#ece5d8] text-black font-black rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest overflow-hidden"
              >
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                <span>Attempt Resync</span>
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={this.handleReset}
                  className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 font-bold rounded-xl transition-all text-[10px] uppercase flex items-center justify-center gap-2"
                >
                  <Home size={14} />
                  Safe Zone
                </button>
                <button 
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-500/70 font-bold rounded-xl transition-all text-[10px] uppercase flex items-center justify-center gap-2"
                >
                  <Terminal size={14} />
                  Purge Cache
                </button>
              </div>
            </div>

            {/* Footer Status */}
            <div className="mt-8 flex justify-between items-center opacity-40 text-[8px] font-mono uppercase tracking-[0.3em]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Node: ERROR_404</span>
              </div>
              <span>Emergency Protocol Active</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
