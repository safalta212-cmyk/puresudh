import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare state: ErrorBoundaryState;
  declare setState: (
    updater:
      | Partial<ErrorBoundaryState>
      | ((prevState: ErrorBoundaryState) => Partial<ErrorBoundaryState>)
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : String(error || 'Unexpected application error');
    let friendly = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.error && parsed.operationType) {
        friendly = `${parsed.error} (${parsed.operationType}${parsed.path ? ` on ${parsed.path}` : ''})`;
      }
    } catch {
      // Plain error message
    }
    return {
      hasError: true,
      errorMessage: friendly,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught error:', error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', '/');
      } catch {
        // ignore
      }
      window.location.href = '/';
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 text-stone-900">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-lg p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-stone-900 font-serif">
              Something went wrong
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              We ran into an unexpected issue displaying this screen. Your cart and order data are safe.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-700 break-words">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
