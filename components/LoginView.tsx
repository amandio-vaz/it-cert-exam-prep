

import React, { useState } from 'react';
import { SparklesIcon } from './icons'; // Assume SparklesIcon is available in icons.tsx
import { Link } from 'react-router-dom';

interface LoginViewProps {
    onLogin: (email: string, password: string) => boolean;
}

const isValidEmail = (email: string): boolean => {
    // Regex simples para validação de e-mail. Pode ser expandido para mais rigor
    // Ex: user@domain.com
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null); // Clear previous login errors
        if (!isValidEmail(email)) {
            setEmailError('Por favor, insira um endereço de e-mail válido.');
            return;
        }
        if (password.length < 6) { // Simple password validation
            setEmailError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        setEmailError(null);
        
        const success = await onLogin(email, password);
        if (!success) {
            setLoginError('Email ou senha inválidos.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-gray-900 dark:to-black">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl shadow-2xl animate-fade-in-slide-up">
                <div className="text-center">
                    <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-violet-500" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bem-vindo(a) ao Cortex</h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Entre para começar sua jornada de certificação.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-2 border border-slate-700 bg-slate-800/60 placeholder-gray-500 text-gray-200 rounded-md focus:outline-none focus:ring-violet-500 focus:border-violet-500 focus:z-10 sm:text-sm"
                                placeholder="Endereço de e-mail"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Senha</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-2 border border-slate-700 bg-slate-800/60 placeholder-gray-500 text-gray-200 rounded-md focus:outline-none focus:ring-violet-500 focus:border-violet-500 focus:z-10 sm:text-sm"
                                placeholder="Senha"
                            />
                        </div>
                    </div>
                    {emailError && <p className="text-red-500 text-sm mt-2">{emailError}</p>}
                    {loginError && <p className="text-red-500 text-sm mt-2">{loginError}</p>}
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-all duration-200 shadow-lg hover:shadow-violet-500/30"
                        >
                            Entrar
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <Link to="/register" className="font-medium text-violet-400 hover:text-violet-300">
                        Não tem uma conta? Registre-se!
                    </Link>
                </div>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Ao entrar, você concorda com nossos termos de serviço e política de privacidade.
                </p>
            </div>
        </div>
    );
};

export default LoginView;