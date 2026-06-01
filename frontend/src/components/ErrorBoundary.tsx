import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-rose-600 w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">⚠ Failed to load task or page</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-md">
            We encountered an unexpected error while trying to display this component. 
            {this.state.error && (
              <span className="block mt-2 font-mono text-xs text-rose-500 bg-rose-50 p-2 rounded">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <RefreshCcw size={16} /> Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
