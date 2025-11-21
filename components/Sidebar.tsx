
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    XMarkIcon,
    SparklesIcon,
    ChartBarIcon,
    RectangleStackIcon,
    PhotoIcon,
    CpuChipIcon, // Usado para Configuração
    DotIcon, // Ícone para destaque do item ativo
    ArrowRightLeftIcon // NOVO: Ícone para o botão de toggle
} from './icons';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (path: string) => void;
    onToggle: () => void; // NOVO: Prop para alternar o estado do sidebar (recolher/expandir)
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, onToggle }) => {
    const location = useLocation();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const handleNavigationClick = (path: string) => {
        onNavigate(path);
        // Em mobile, o sidebar fecha ao navegar. Em desktop, ele permanece no estado atual (recolhido/expandido)
        if (window.innerWidth < 768) {
            onClose(); 
        }
    };

    // Fechar sidebar ao clicar fora (apenas para telas menores onde é um overlay)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Em telas maiores (>=768px), o sidebar não é um overlay e não deve fechar ao clicar fora.
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
        bg-slate-900/90 backdrop-blur-lg border-r border-slate-700/50 shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-20'}
        md:translate-x-0 md:static md:block
        ${!isOpen ? 'md:w-20' : 'md:w-64'}
        ${!isOpen && 'md:overflow-hidden'}
        text-gray-200 /* Adicionado: Garante que o texto dentro do sidebar seja claro */
    `;

    const navItemClasses = (path: string) => `
        relative flex items-center ${isOpen ? 'justify-start' : 'justify-center'} gap-3 px-4 py-2 rounded-lg
        font-medium whitespace-nowrap overflow-hidden
        transition-colors duration-200
        ${location.pathname === path
            ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-md' // Gradiente mais proeminente e sombra
            : 'text-gray-300 hover:bg-slate-800/50 hover:text-white'
        }
    `;

    const navIconClasses = `w-6 h-6 flex-shrink-0`;
    const dotIconClasses = `w-2 h-2 text-white absolute left-2 -ml-0.5`; // Classes para o DotIcon

    return (
        <aside
            ref={sidebarRef}
            className={sidebarClasses}
            aria-label="Menu principal"
        >
            {/* Header do Sidebar */}
            <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} p-4 border-b border-slate-700/50 h-[64px]`}>
                {/* Botão de Toggle (Desktop) */}
                <button
                    onClick={onToggle}
                    className={`hidden md:flex items-center justify-center p-2 rounded-full text-gray-400 hover:bg-slate-800 hover:text-white transition-colors
                                ${isOpen ? 'ml-auto' : 'mx-auto'}`}
                    aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
                    title={isOpen ? "Recolher menu" : "Expandir menu"}
                >
                    <ArrowRightLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
                </button>

                {/* Botão de Fechar (Mobile) */}
                <button
                    onClick={onClose}
                    className="p-2 rounded-full text-gray-400 hover:bg-slate-800 hover:text-white transition-colors md:hidden"
                    aria-label="Fechar menu"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Itens de Navegação */}
            <nav className="p-4 space-y-2">
                <button
                    onClick={() => handleNavigationClick('/')}
                    className={navItemClasses('/')}
                    aria-current={location.pathname === '/' ? 'page' : undefined}
                >
                    {location.pathname === '/' && isOpen && <DotIcon className={dotIconClasses} />}
                    <CpuChipIcon className={navIconClasses} />
                    {isOpen && <span className="flex-grow text-left">Configuração</span>}
                </button>
                <button
                    onClick={() => handleNavigationClick('/exam')}
                    className={navItemClasses('/exam')}
                    aria-current={location.pathname === '/exam' ? 'page' : undefined}
                >
                    {location.pathname === '/exam' && isOpen && <DotIcon className={dotIconClasses} />}
                    <SparklesIcon className={navIconClasses} />
                    {isOpen && <span className="flex-grow text-left">Exame</span>}
                </button>
                <button
                    onClick={() => handleNavigationClick('/flashcards')}
                    className={navItemClasses('/flashcards')}
                    aria-current={location.pathname === '/flashcards' ? 'page' : undefined}
                >
                    {location.pathname === '/flashcards' && isOpen && <DotIcon className={dotIconClasses} />}
                    <RectangleStackIcon className={navIconClasses} />
                    {isOpen && <span className="flex-grow text-left">Flashcards</span>}
                </button>
                <button
                    onClick={() => handleNavigationClick('/history')}
                    className={navItemClasses('/history')}
                    aria-current={location.pathname === '/history' ? 'page' : undefined}
                >
                    {location.pathname === '/history' && isOpen && <DotIcon className={dotIconClasses} />}
                    <ChartBarIcon className={navIconClasses} />
                    {isOpen && <span className="flex-grow text-left">Histórico</span>}
                </button>
                <button
                    onClick={() => handleNavigationClick('/image-analyzer')}
                    className={navItemClasses('/image-analyzer')}
                    aria-current={location.pathname === '/image-analyzer' ? 'page' : undefined}
                >
                    {location.pathname === '/image-analyzer' && isOpen && <DotIcon className={dotIconClasses} />}
                    <PhotoIcon className={navIconClasses} />
                    {isOpen && <span className="flex-grow text-left">Analisador de Imagem</span>}
                </button>
            </nav>
        </aside>
    );
};

export default Sidebar;