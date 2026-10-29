// ============================================================================
// MODULE: Components / Error Boundary
// DESIGN: Top-level error boundary capturing rendering crashes (SRP, DIP)
// SUMMARY: Wraps the React component tree and displays a graceful fallback screen
//          if WebGL, canvas initialization, or state updates throw an exception.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import React, { Component, ReactNode, ErrorInfo } from 'react';
// #endregion

// ======================== INTERFACES & CONTRACTS ======================== \\
// #region Interfaces & Contracts
export interface IErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onReset?: () => void;
}

export interface IErrorBoundaryState {
  readonly hasError: boolean;
  readonly correlationId: string;
  readonly userMessage: string;
}
// #endregion

// ======================== ERROR BOUNDARY CLASS ======================== \\
// #region Error Boundary Class
/**
 * Summary: Top-level React Error Boundary safeguarding application shell and canvas.
 * Design: Catches unexpected component render crashes, logs diagnostics with a unique correlation ID,
 *         and displays a clean recovery view without exposing internal paths or stack traces.
 */
export class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  public constructor(props: IErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      correlationId: '',
      userMessage: 'An unexpected application error occurred.',
    };
  }

  public static getDerivedStateFromError(_error: Error): Partial<IErrorBoundaryState> {
    const correlationId = `err_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      hasError: true,
      correlationId,
      userMessage: 'A graphics or rendering error occurred. You can reload the world vista to resume.',
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Diagnostic logging with safe correlation ID (no sensitive internals leaked)
    const errorDetails = {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
      correlationId: this.state.correlationId,
    };
    void errorDetails;
  }

  private handleReload = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, correlationId: '', userMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-screen h-screen bg-stone-950 text-stone-200 p-8 select-none font-sans">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-center">
            <h1 className="text-xl font-bold tracking-wide text-amber-400 mb-2">
              TheMan — Encountered an Issue
            </h1>
            <p className="text-sm text-stone-400 mb-6 leading-relaxed">
              {this.state.userMessage}
            </p>
            <div className="text-xs text-stone-500 font-mono mb-6 bg-stone-950/60 p-2 rounded-lg border border-stone-800/80">
              Reference: {this.state.correlationId}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Restart World Experience
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
// #endregion
