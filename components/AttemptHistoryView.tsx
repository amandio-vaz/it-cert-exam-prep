
import React from 'react';
import { Attempt } from '../types';
import { ArrowLeftIcon, ChartBarIcon, TrophyIcon } from './icons';

interface AttemptHistoryViewProps {
    attempts: Attempt[];
    onBack: () => void;
    onViewDetails: (attempt: Attempt) => void;
}

const AttemptHistoryView: React.FC<AttemptHistoryViewProps> = ({ attempts, onBack, onViewDetails }) => {
    if (attempts.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700/50">
                    <ChartBarIcon className="w-16 h-16 mx-auto text-gray-400" />
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Nenhum Exame Realizado</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Comece a gerar simulados para ver seu histórico de desempenho aqui.
                    </p>
                    <button onClick={onBack} className="mt-6 flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        Voltar à Configuração
                    </button>
                </div>
            </div>
        );
    }

    const sortedAttempts = [...attempts].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar à Configuração
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ChartBarIcon className="w-6 h-6 text-cyan-500" />
                    Histórico de Exames
                </h1>
            </div>

            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-4">Clique em uma tentativa para ver os detalhes.</p>
                <div className="space-y-4">
                    {sortedAttempts.map((attempt, index) => {
                        const scoreColor = attempt.score >= 70 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
                        const date = new Date(attempt.timestamp).toLocaleDateString('pt-BR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                        return (
                            <button
                                key={index}
                                onClick={() => onViewDetails(attempt)}
                                className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                            >
                                <div className="flex-grow">
                                    <p className="text-lg font-semibold text-gray-800 dark:text-white">{attempt.examCode}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{date}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrophyIcon className={`w-5 h-5 ${scoreColor}`} />
                                    <span className={`text-xl font-bold ${scoreColor}`}>{attempt.score.toFixed(1)}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AttemptHistoryView;