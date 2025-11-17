

import React, { useState } from 'react';

const shimmerStyle = `
@keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
}
.animate-shimmer {
    background: linear-gradient(to right, #a78bfa 20%, #c4b5fd 40%, #8b5cf6 60%, #a78bfa 80%);
    background-size: 200% auto;
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    animation: shimmer 4s linear infinite;
}
`;

interface LoginViewProps {
    onLogin: (email: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email);
    };

    return (
        <>
            <style>{shimmerStyle}</style>
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl shadow-2xl">
                    <div className="text-center">
                         <div className="mb-6">
                            <h1 className="text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
                                Cortex
                            </h1>
                            <h2 className="text-2xl font-semibold tracking-wide animate-shimmer">
                                MyF*ck-IT-Exam
                            </h2>
                        </div>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Faça login para iniciar ou continuar a preparação para sua próxima certificação.</p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="rounded-md shadow-sm">
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
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500"
                            >
                                Entrar com E-mail
                            </button>
                        </div>
                    </form>
                     <p className="text-center text-xs text-gray-500">
                        O App MyF*ck-IT-Exam está na versão alfa e pode cometer erros. Confira sempre as respostas.
                    </p>
                </div>
            </div>
        </>
    );
};

export default LoginView;