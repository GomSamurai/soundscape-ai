import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no manejado:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 my-4 rounded-2xl bg-slate-900/90 border border-rose-500/50 shadow-2xl flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-sm font-bold text-white">
              {this.props.fallbackTitle || 'Se detectó una incidencia en la visualización'}
            </h4>
            <p className="text-xs text-slate-400">
              {this.state.error?.message ||
                'La aplicación protegió el resto de la interfaz y la reproducción acústica.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recuperar componente</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
