import React from 'react';
import { SparklesIcon } from './icons';

const Header: React.FC = () => {
    return (
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 sticky top-0 z-10">
            <div className="container mx-auto flex items-center gap-4">
                <SparklesIcon className="w-8 h-8 text-cyan-400" />
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">CortexExamSuite</h1>
                    <p className="text-sm text-gray-400">Seu assistente de estudos para certificações de TI, com tecnologia da era Agêntica.</p>
                </div>
            </div>
        </header>
    );
};

export default Header;