import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode, name: string }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode, name: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error in", this.props.name, error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-800 rounded">
          <h2 className="font-bold mb-2">Crash in {this.props.name}!</h2>
          <p className="font-mono text-xs whitespace-pre-wrap">{this.state.error?.toString()}</p>
          <details className="mt-2 text-xs opacity-70">
            <summary>Component Stack</summary>
            <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
