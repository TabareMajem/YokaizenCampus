import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 font-mono text-red-500 relative overflow-hidden">
          {/* Glitch Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
             <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#ff0000_2px,#ff0000_4px)]"></div>
          </div>
          
          <div className="z-10 bg-black/90 border-2 border-red-600 p-8 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.5)] max-w-md text-center">
            <AlertTriangle size={64} className="mx-auto mb-6 animate-pulse" />
            <h1 className="text-4xl font-black mb-2 tracking-tighter glitch-text">SYSTEM FAILURE</h1>
            <div className="h-px w-full bg-red-900 my-4"></div>
            <p className="text-xs text-red-300 mb-6 bg-red-950/30 p-4 rounded border border-red-900 text-left overflow-hidden">
              <span className="font-bold block mb-1">ERROR_LOG:</span>
              {this.state.error?.message || 'Unknown Critical Failure'}
            </p>
            <Button 
                variant="danger" 
                onClick={() => window.location.reload()} 
                fullWidth
                className="group"
            >
                <RefreshCw className="mr-2 group-hover:rotate-180 transition-transform" size={18} />
                REBOOT SYSTEM
            </Button>
          </div>
          
          <div className="absolute bottom-4 text-[10px] text-red-800">
              YOKAIZEN_OS_KERNEL_PANIC // DUMP_MEMORY
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}