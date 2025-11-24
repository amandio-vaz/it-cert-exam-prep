
import React, { useState } from 'react';
import { SparklesIcon } from './icons'; 
import { useNavigate } from 'react-router-dom'; 

interface LoginViewProps {
    onLogin: (email: string) => boolean; 
}

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);
    const navigate = useNavigate(); 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null); 
        if (!isValidEmail(email)) {
            setEmailError('Por favor, insira um endereço de e-mail válido.');
            return;
        }
        setEmailError(null);
        
        const success = await onLogin(email); 
        if (!success) {
            setLoginError('Falha ao autenticar. Tente novamente.'); 
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden isolate">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[bottom_1px_center] pointer-events-none"></div>
            
            {/* Glowing Orbs */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none"></div>
            <div className="absolute top-0 -right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>
            <div className="absolute -bottom-40 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-lg p-1">
                {/* Glassmorphism Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-3xl shadow-2xl animate-fade-in-slide-up ring-1 ring-white/10">
                    
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-white/10 shadow-inner">
                            <SparklesIcon className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                        </div>
                        
                        <div className="space-y-2">
                            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">
                                    Cortex
                                </span>
                            </h1>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-300 tracking-wide">
                                MyF*ck-IT-Exam
                            </p>
                        </div>
                        
                        <p className="text-slate-400 text-sm sm:text-base font-light max-w-sm mx-auto leading-relaxed">
                            Sua jornada de certificação impulsionada por IA. <br/>
                            Prepare-se com inteligência e precisão.
                        </p>
                    </div>

                    <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="relative block w-full px-4 py-4 bg-slate-900/80 border border-slate-700 placeholder-slate-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent sm:text-sm transition-all shadow-inner"
                                    placeholder="Digite seu e-mail corporativo ou pessoal"
                                />
                            </div>
                        </div>

                        {emailError && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-pulse">
                                {emailError}
                            </div>
                        )}
                        {loginError && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-pulse">
                                {loginError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5"
                        >
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <SparklesIcon className="h-5 w-5 text-indigo-300 group-hover:text-white transition-colors" aria-hidden="true" />
                            </span>
                            Acessar Plataforma
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-500 hover:text-slate-400 transition-colors cursor-pointer">
                            Termos de Serviço &bull; Política de Privacidade
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
