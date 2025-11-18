import React from 'react';
import { Attempt } from '../types';
import { TrophyIcon, ClipboardDocumentCheckIcon, ChartBarIcon, RectangleStackIcon, XCircleIcon } from './icons';

interface DashboardProps {
    attempts: Attempt[];
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ attempts }) => {
    if (attempts.length === 0) return null;

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correctAnswers, 0);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const overallPercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const totalIncorrect = totalQuestions - totalCorrect;
    const uniqueExamCodes = [...new Set(attempts.map(a => a.examCode))];
    const last5Attempts = attempts.slice(-5);

    // SVG Chart logic
    const chartWidth = 300;
    const chartHeight = 100;
    const maxScore = 100;
    const dataPoints = last5Attempts.map((attempt, index) => {
        const x = (index / (last5Attempts.length > 1 ? last5Attempts.length - 1 : 1)) * chartWidth;
        const y = chartHeight - (attempt.score / maxScore) * chartHeight;
        return { x, y, score: attempt.score };
    });

    const pathData = dataPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');

    return (
        <div className="bg-slate-900/50 backdrop-blur-lg rounded-2xl p-6 mb-10 border border-slate-700/50 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Seu Painel de Desempenho</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<ChartBarIcon className="w-6 h-6 text-white"/>} title="Simulados Realizados" value={totalAttempts} color="bg-cyan-500/80" />
                <StatCard icon={<TrophyIcon className="w-6 h-6 text-white"/>} title="Acertos (%)" value={`${overallPercentage.toFixed(1)}%`} color="bg-green-500/80" />
                <StatCard icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-white"/>} title="Respostas Corretas" value={totalCorrect} color="bg-violet-500/80" />
                <StatCard icon={<XCircleIcon className="w-6 h-6 text-white"/>} title="Respostas Incorretas" value={totalIncorrect} color="bg-red-500/80" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="md:col-span-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><RectangleStackIcon className="w-5 h-5 text-gray-400" /> Histórico de Exames</h3>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {uniqueExamCodes.map(code => (
                            <li key={code} className="text-sm text-gray-300 bg-slate-700/50 px-2 py-1 rounded-md">{code}</li>
                        ))}
                    </ul>
                </div>
                <div className="md:col-span-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white mb-2">Evolução da Pontuação (últimos 5)</h3>
                    {dataPoints.length > 1 ? (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={`${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`} fill="url(#area-gradient)" />
                        <path d={pathData} fill="none" stroke="url(#line-gradient)" strokeWidth="2" />
                        {dataPoints.map((p, i) => (
                            <g key={i} className="group cursor-pointer">
                                <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
                                <circle cx={p.x} cy={p.y} r="3" fill="#fff" className="group-hover:r-4 transition-all" />
                                <title>{`Tentativa ${attempts.length - last5Attempts.length + i + 1}: ${p.score.toFixed(1)}%`}</title>
                            </g>
                        ))}
                    </svg>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">Complete mais simulados para ver seu progresso.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
