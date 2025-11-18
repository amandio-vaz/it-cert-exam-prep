

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
import { XCircleIcon, XMarkIcon } from './components/icons'; // Importa o ícone de erro e o XMarkIcon

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Você também pode registrar o erro em um serviço de relatórios de erros
    console.error("Erro capturado por ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-gray-900 dark:to-black dark:text-gray-200 p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 text-center max-w-md space-y-4">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold dark:text-white">Ops! Algo deu errado.</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ocorreu um erro inesperado ao carregar o aplicativo.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {this.state.error?.message || 'Erro desconhecido.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md transition-colors"
            >
              Tentar Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Garante que o DOM esteja completamente carregado antes de montar o aplicativo React
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <HashRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HashRouter>
    </React.StrictMode>
  );
});