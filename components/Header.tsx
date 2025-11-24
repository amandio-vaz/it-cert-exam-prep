
import React from 'react';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from './icons'; 

interface HeaderProps {
    theme: 'light' | 'dark' | null;
    onThemeToggle: () => void;
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ theme, onThemeToggle, onToggleSidebar, isSidebarOpen }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 shadow-lg h-16 flex items-center justify-between px-4 md:px-8 transition-[margin-left] duration-300 ease-in-out">
            <div className="flex items-center gap-4">
                {/* Botão de abrir/fechar sidebar em mobile */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-md text-gray-400 hover:bg-slate-800 hover:text-white transition-colors md:hidden"
                    aria-label={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
                >
                    {isSidebarOpen ? (
                        <XMarkIcon className="w-6 h-6" />
                    ) : (
                        <Bars3Icon className="w-6 h-6" />
                    )}
                </button>
                
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 drop-shadow-sm">
                        Cortex
                    </span> 
                    <span className="text-lg font-bold text-slate-300 hidden sm:block tracking-wide">
                        MyF*ck-IT-Exam
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={onThemeToggle}
                    className="p-2 rounded-md text-gray-400 hover:bg-slate-800 hover:text-white transition-colors ring-1 ring-slate-700/50"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
            </div>
        </header>
    );
};
