
import React from 'react';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from './icons'; // Removed ArrowRightOnRectangleIcon as logout is gone

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
                {/* Simplified logo placeholder */}
                <span className="text-xl font-bold text-white">Cortex</span> 
                <span className="text-xl font-bold text-white hidden sm:block">MyF*ck-IT-Exam</span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={onThemeToggle}
                    className="p-2 rounded-md text-gray-400 hover:bg-slate-800 hover:text-white transition-colors"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>
                {/* Login/User section removed */}
            </div>
        </header>
    );
};
