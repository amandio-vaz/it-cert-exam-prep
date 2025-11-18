
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    XMarkIcon,
    SparklesIcon,
    ChartBarIcon,
    RectangleStackIcon,
    PhotoIcon,
    CpuChipIcon, // Usado para Configuração
    DotIcon // NOVO: Ícone para destaque do item ativo
} from './icons';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate }) => {
    const location = useLocation();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const handleNavigationClick = (path: string) => {
        onNavigate(path);
        onClose(); // Fecha o sidebar ao navegar
    };

    // Fechar sidebar ao clicar fora (apenas para telas menores onde é um overlay)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (window.innerWidth < 768 && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Ocultar em desktop se não estiver aberto
    // Em mobile, é fixed e overlay
    const sidebarClasses = `
        fixed top-0 left-0 h-full z-40
        w-64 bg-slate-900/90 backdrop-blur-lg border-r border-slate-700/50 shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block
        ${!isOpen && 'hidden md:block'}
    `;

    const navItemClasses = (path: string) => `
        flex items-center gap-3 px-4 py-2 rounded-lg text-lg font-medium
        transition-colors duration-200
        ${location.pathname === path
            ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-md' // Gradiente mais proeminente e sombra
            : 'text-gray-300 hover:bg-slate-800/50 hover:text-white'
        }
    `;

    const navIconClasses = `w-6 h-6`;
    const dotIconClasses = `w-2 h-2 text-white mr-1 -ml-1`; // Classes para o DotIcon

    return (
        <aside ref={sidebarRef} className={sidebarClasses} aria-label="Menu principal">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <img src="data:image/png;base64,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" alt="Cortex Logo" className="w-8 h-8"/>
                    <span className="text-xl font-bold text-white">CortexExam</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full text-gray-400 hover:bg-slate-800 hover:text-white transition-colors md:hidden"
                    aria-label="Fechar menu"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
            <nav className="p-4 space-y-2">
                <button
                    onClick={() => handleNavigationClick('/')}
                    className={navItemClasses('/')}
                    aria-current={location.pathname === '/' ? 'page' : undefined}
                >
                    {location.pathname === '/' && <DotIcon className={dotIconClasses} />}
                    <CpuChipIcon className={navIconClasses} />
                    Configuração
                </button>
                <button
                    onClick={() => handleNavigationClick('/exam')}
                    className={navItemClasses('/exam')}
                    aria-current={location.pathname === '/exam' ? 'page' : undefined}
                >
                    {location.pathname === '/exam' && <DotIcon className={dotIconClasses} />}
                    <SparklesIcon className={navIconClasses} />
                    Exame
                </button>
                <button
                    onClick={() => handleNavigationClick('/flashcards')}
                    className={navItemClasses('/flashcards')}
                    aria-current={location.pathname === '/flashcards' ? 'page' : undefined}
                >
                    {location.pathname === '/flashcards' && <DotIcon className={dotIconClasses} />}
                    <RectangleStackIcon className={navIconClasses} />
                    Flashcards
                </button>
                <button
                    onClick={() => handleNavigationClick('/history')}
                    className={navItemClasses('/history')}
                    aria-current={location.pathname === '/history' ? 'page' : undefined}
                >
                    {location.pathname === '/history' && <DotIcon className={dotIconClasses} />}
                    <ChartBarIcon className={navIconClasses} />
                    Histórico
                </button>
                <button
                    onClick={() => handleNavigationClick('/image-analyzer')}
                    className={navItemClasses('/image-analyzer')}
                    aria-current={location.pathname === '/image-analyzer' ? 'page' : undefined}
                >
                    {location.pathname === '/image-analyzer' && <DotIcon className={dotIconClasses} />}
                    <PhotoIcon className={navIconClasses} />
                    Analisador de Imagem
                </button>
            </nav>
        </aside>
    );
};

export default Sidebar;
