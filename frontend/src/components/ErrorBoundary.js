// components/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error || new Error('Error desconocido'),
      errorInfo: errorInfo || { componentStack: 'Stack no disponible' }
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log this to an error reporting service
    // errorReportingService.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>¡Oops! Algo salió mal</h2>
            <p>Ha ocurrido un error inesperado en la aplicación.</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Detalles del error (modo desarrollo)</summary>
                <pre className="error-stack">
                  {this.state.error ? this.state.error.toString() : 'Error no disponible'}
                  {this.state.errorInfo && this.state.errorInfo.componentStack ? 
                    this.state.errorInfo.componentStack : 
                    '\nStack trace no disponible'}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="admin-btn admin-btn-primary"
              >
                🔄 Intentar de nuevo
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="admin-btn admin-btn-secondary"
              >
                🔄 Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;