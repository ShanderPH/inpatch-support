'use client';

import React from 'react';
import { Button } from '@heroui/button';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log errors only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const reset = () => {
        this.setState({ hasError: false, error: undefined });
      };

      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;

        return <FallbackComponent error={this.state.error} reset={reset} />;
      }

      return <DefaultErrorFallback error={this.state.error} reset={reset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  reset: () => void;
}

export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
}) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="liquid-glass p-8 max-w-md w-full text-center">
      <FiAlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
      <h2 className="text-xl font-bold text-foreground mb-2">
        Algo deu errado
      </h2>
      <p className="text-default-600 mb-4">
        {error?.message || 'Ocorreu um erro inesperado. Tente novamente.'}
      </p>
      <Button
        color="primary"
        startContent={<FiRefreshCw className="w-4 h-4" />}
        onClick={reset}
      >
        Tentar Novamente
      </Button>
    </div>
  </div>
);

export const ProjectErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
}) => (
  <div className="liquid-glass p-6 text-center">
    <FiAlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-500" />
    <h3 className="text-lg font-semibold text-foreground mb-2">
      Erro ao carregar projetos
    </h3>
    <p className="text-default-600 text-sm mb-4">
      {error?.message || 'Não foi possível carregar os projetos.'}
    </p>
    <Button
      color="primary"
      size="sm"
      startContent={<FiRefreshCw className="w-4 h-4" />}
      variant="ghost"
      onClick={reset}
    >
      Tentar Novamente
    </Button>
  </div>
);
