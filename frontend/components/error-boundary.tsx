'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-gray-600">
            We're sorry, but there was an error loading this page. Please try refreshing or come back later.
          </p>
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 max-w-md overflow-auto rounded bg-gray-100 p-4 text-left text-sm text-gray-800">
              {this.state.error.message}
            </pre>
          )}
          <Button
            onClick={() => window.location.reload()}
            className="mt-6"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = 'Error',
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-10 w-10 text-red-500" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-gray-600">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          Try Again
        </Button>
      )}
    </div>
  );
}
