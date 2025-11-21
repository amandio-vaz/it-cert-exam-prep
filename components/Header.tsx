

import React from 'react';
import { SunIcon, MoonIcon, ArrowRightOnRectangleIcon, Bars3Icon } from './icons'; // Importar Bars3Icon
import type { User } from '../types'; // Alterado para 'import type' para User

// Removed logoBase64 due to potential parsing issues and moved to a simpler approach.
// If a logo is needed, it should be an actual image file linked or properly base64 encoded.

interface HeaderProps {
    user: User | null;
    theme: 'light' | 'dark' | null;
    onThemeToggle: () => void;
    onLogout: () => void;
    onToggleSidebar: () => void; // Prop para alternar o estado do sidebar
    isSidebarOpen: boolean; // Estado atual do sidebar
}

export const Header: React.FC<HeaderProps> = ({ user, theme, onThemeToggle, onLogout, onToggleSidebar, isSidebarOpen }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 shadow-lg h-16 flex items-center justify-between px-4 md:px-8 transition-[margin-left] duration-300 ease-in-out">
            <div className="flex items-center gap-4">
                {/* Botão de abrir/fechar sidebar em mobile */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-md text-gray-400 hover:bg-slate-800 hover:text-white transition-colors md:hidden"
                    aria-label="Toggle menu"
                >
                    <Bars3Icon className="w-6 h-6" />
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
                {user ? (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm hidden sm:block">{user.email}</span>
                        <button
                            onClick={onLogout}
                            className="p-2 rounded-md text-gray-400 hover:bg-slate-800 hover:text-white transition-colors"
                            aria-label="Logout"
                        >
                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                        </button>
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">Convidado</span>
                )}
            </div>
        </header>
    );
};