import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro de runtime:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetStorage = () => {
    try {
      // Clear gremio localStorage keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('gremio_') || key.includes('gremio'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error('Falha ao limpar armazenamento:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1A2421] text-white flex items-center justify-center p-6 select-none">
          <div className="max-w-lg w-full bg-white text-slate-800 border-4 border-[#D4AF37] p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-10 h-10 bg-[#4B5320] flex items-center justify-center text-[#D4AF37] font-bold text-lg font-institutional border border-[#D4AF37]">
                EB
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A2421] font-institutional">
                  Grêmio do NPOR • Recuperação de Sistema
                </h1>
                <p className="text-xs text-slate-500">Módulo de Integridade e Autoproteção</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
              <p className="font-bold">Aviso de Recuperação de Estado:</p>
              <p className="leading-relaxed">
                Foi detectada uma inconsistência temporária nos dados locais do navegador. O sistema preservou a integridade dos módulos.
              </p>
              {this.state.error && (
                <pre className="p-2 bg-white/80 border border-amber-200 font-mono text-[11px] overflow-x-auto text-rose-700">
                  {this.state.error.message}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold uppercase text-xs tracking-wider transition"
              >
                Recarregar Página
              </button>
              <button
                onClick={this.handleResetStorage}
                className="flex-1 py-2.5 px-4 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs tracking-wider shadow-sm transition"
              >
                Restaurar Base Padrão
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
