import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-rose-50/90 dark:bg-rose-950/40 rounded-2xl border border-rose-200/90 dark:border-rose-900/60 shadow-sm text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  {this.props.fallbackTitle || 'Something went wrong displaying this view'}
                </h3>
                <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-1 leading-relaxed">
                  {this.props.fallbackMessage ||
                    'An unexpected render issue occurred. Your application remains active, and no data was lost.'}
                </p>
                {this.state.error?.message && (
                  <p className="mt-2 text-[11px] font-mono text-rose-800/80 dark:text-rose-400/90 bg-rose-100/60 dark:bg-rose-900/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800">
                    {this.state.error.message}
                  </p>
                )}
              </div>
            </div>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="text-xs font-semibold border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
            {this.props.onClose && (
              <Button
                variant="secondary"
                size="sm"
                onClick={this.props.onClose}
                className="text-xs font-semibold"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
