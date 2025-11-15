
import React from 'react';
import { SparklesIcon } from './icons';

interface LoadingIndicatorProps {
    message: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl max-w-2xl mx-auto shadow-lg">
            <SparklesIcon className="w-12 h-12 text-cyan-500 dark:text-cyan-400 animate-pulse" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Processando...</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{message}</p>
        </div>
    );
};

export default LoadingIndicator;