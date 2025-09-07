// src/shared/errors/ErrorBoundary.tsx
import React from 'react';
import { ErrorFallback } from './ErrorFallback';
import { errorLogger } from './ErrorLogger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error;
    resetErrorBoundary?: () => void;
    requestId?: string;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  requestId?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { 
    hasError: false 
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // تسجيل الخطأ
    errorLogger.log(error, { errorInfo });
    
    // تحديث الحالة
    this.setState({ 
      requestId: (error as any).requestId || undefined 
    });

    // استدعاء callback مخصص إذا كان متوفراً
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetErrorBoundary = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      requestId: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
          requestId={this.state.requestId}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}
