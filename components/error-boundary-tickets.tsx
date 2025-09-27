/**
 * Error Boundary para Sistema de Tickets - Tratamento de Erros Graceful
 * Componente para capturar e exibir erros de forma elegante
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiInfo } from 'react-icons/fi';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class TicketErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Ticket Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Chamar callback de erro personalizado se fornecido
    this.props.onError?.(error, errorInfo);

    // Log para monitoramento (pode ser enviado para Sentry, LogRocket, etc.)
    if (typeof window !== 'undefined') {
      // Em produção, enviar para serviço de monitoramento
      console.error('Error Boundary - Ticket System:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Se um fallback customizado foi fornecido, usar ele
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;

        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      // Fallback padrão elegante
      return (
        <DefaultTicketErrorFallback
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Componente de fallback padrão
interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
}

function DefaultTicketErrorFallback({
  error,
  errorInfo,
  onReset,
}: DefaultErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  // Determinar tipo de erro para melhor UX
  const getErrorType = (error: Error) => {
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'network';
    }
    if (error.message.includes('HubSpot') || error.message.includes('API')) {
      return 'api';
    }
    if (
      error.message.includes('Database') ||
      error.message.includes('Prisma')
    ) {
      return 'database';
    }

    return 'generic';
  };

  const errorType = getErrorType(error);

  const errorMessages = {
    network: {
      title: 'Problema de Conexão',
      description:
        'Não foi possível conectar aos serviços. Verifique sua conexão com a internet.',
      suggestion: 'Tente novamente em alguns segundos ou atualize a página.',
    },
    api: {
      title: 'Erro na Integração',
      description: 'Houve um problema na comunicação com o HubSpot.',
      suggestion:
        'Nossa equipe foi notificada. Tente novamente em alguns minutos.',
    },
    database: {
      title: 'Erro no Sistema',
      description: 'Problema temporário no banco de dados.',
      suggestion:
        'Já estamos trabalhando para resolver. Tente novamente em breve.',
    },
    generic: {
      title: 'Ops! Algo deu errado',
      description: 'Encontramos um erro inesperado no sistema de tickets.',
      suggestion: 'Tente recarregar a página ou volte à página inicial.',
    },
  };

  const currentError = errorMessages[errorType];

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-danger-200 bg-danger-50/30 dark:bg-danger-950/30">
          <CardBody className="text-center p-8">
            {/* Ícone de erro com animação */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              className="flex justify-center mb-6"
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="p-4 rounded-full bg-danger-100 dark:bg-danger-900/50">
                <FiAlertTriangle className="text-danger-500 text-4xl" />
              </div>
            </motion.div>

            {/* Título e descrição */}
            <h2 className="text-xl font-bold text-foreground mb-2">
              {currentError.title}
            </h2>

            <p className="text-foreground/70 mb-4">
              {currentError.description}
            </p>

            <p className="text-sm text-foreground/60 mb-6">
              {currentError.suggestion}
            </p>

            {/* Ações principais */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Button
                className="flex-1"
                color="primary"
                startContent={<FiRefreshCw />}
                onPress={onReset}
              >
                Tentar Novamente
              </Button>

              <Button
                className="flex-1"
                color="default"
                startContent={<FiRefreshCw />}
                variant="bordered"
                onPress={handleReload}
              >
                Recarregar Página
              </Button>
            </div>

            {/* Ação secundária */}
            <Button
              color="default"
              size="sm"
              startContent={<FiHome />}
              variant="light"
              onPress={handleGoHome}
            >
              Voltar ao Início
            </Button>

            {/* Toggle para detalhes técnicos */}
            <div className="mt-6 pt-4 border-t border-divider">
              <Button
                color="default"
                size="sm"
                startContent={<FiInfo />}
                variant="light"
                onPress={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Ocultar' : 'Ver'} Detalhes Técnicos
              </Button>

              {/* Detalhes técnicos colapsáveis */}
              {showDetails && (
                <motion.div
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-default-100 rounded-lg text-left overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                >
                  <div className="text-xs font-mono text-default-700 space-y-2">
                    <div>
                      <strong>Erro:</strong> {error.name}
                    </div>
                    <div>
                      <strong>Mensagem:</strong> {error.message}
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                      <>
                        <div>
                          <strong>Stack:</strong>
                          <pre className="mt-1 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {error.stack}
                          </pre>
                        </div>
                        {errorInfo && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <strong>Timestamp:</strong> {new Date().toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

// Hook para usar error boundary programaticamente
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// HOC para envolver componentes com error boundary
export function withTicketErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <TicketErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </TicketErrorBoundary>
  );

  WrappedComponent.displayName = `withTicketErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}
