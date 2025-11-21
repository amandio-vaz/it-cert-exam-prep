


import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter, useNavigate, NavigateFunction } from 'react-router-dom';
import { XCircleIcon } from './components/icons';

// Define a HOC to inject the `useNavigate` hook into a class component
// Fix: Replaced JSX.IntrinsicAttributes with 'object' to resolve the 'Cannot find namespace JSX' error.
function withRouter<P extends object>(Component: React.ComponentType<P & { navigate: NavigateFunction }>) {
  function ComponentWithRouterProp(props: P) {
    let navigate = useNavigate();
    return <Component {...props} navigate={navigate} />;
  }
  return ComponentWithRouterProp;
}

interface ErrorBoundaryProps {
  children?: ReactNode;
  navigate: NavigateFunction; // Injected by withRouter HOC
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare the state property. This helps TypeScript recognize
  // `this.state` correctly, even if `super(props)` is already handling initialization.
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado por ErrorBoundary:", error, errorInfo);
  }

  handleRetry = () => {
    // Use the navigate function from props to go to the root path
    this.props.navigate('/'); 
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
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
              onClick={this.handleRetry}
              className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap ErrorBoundary with the HOC to provide navigate prop
const ErrorBoundaryWithRouter = withRouter(ErrorBoundary);

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <HashRouter>
        <ErrorBoundaryWithRouter>
          <App />
        </ErrorBoundaryWithRouter>
      </HashRouter>
    </React.StrictMode>
  );
});