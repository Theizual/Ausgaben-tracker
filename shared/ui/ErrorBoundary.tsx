import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center text-center p-4">
          <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-4">Oops! Etwas ist schiefgelaufen.</h1>
          <p className="text-slate-400 mb-6 max-w-md">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie, die Seite neu zu laden. 
            Wenn das Problem weiterhin besteht, könnte ein Zurücksetzen der Anwendungsdaten helfen.
          </p>
          <Button onClick={() => window.location.reload()}>
            Seite neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
