
import React from 'react';
import { Attempt, Question, UserAnswer } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from './icons';
import AudioPlayer from './AudioPlayer';

interface AttemptDetailsViewProps {
    attempt: Attempt;
    onBack: () => void;
}

const AttemptDetailsView: React.FC<AttemptDetailsViewProps> = ({ attempt, onBack }) => {
    const { examData, userAnswers, score, correctAnswers, totalQuestions, timestamp, examCode } = attempt;

    const scoreColor = score >= 70 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    const date = new Date(timestamp).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar ao Histórico
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revisão do Exame</h1>
            </div>

            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 mb-8 text-center shadow-lg">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{examData.examName} ({examCode})</h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">{date}</p>
                <div className="flex justify-center items-baseline gap-4">
                    <p className={`text-7xl font-bold ${scoreColor}`}>{score.toFixed(1)}%</p>
                    <p className="text-2xl text-gray-700 dark:text-gray-300">({correctAnswers} / {totalQuestions} corretas)</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Revisão Detalhada das Questões</h3>
                <div className="space-y-8">
                    {examData.questions.map((q: Question, index: number) => {
                        const userAnswerForQ = userAnswers[q.id] || [];
                        const isCorrect = q.correctAnswers.length === userAnswerForQ.length && q.correctAnswers.every(val => userAnswerForQ.includes(val));
                        return (
                            <div key={q.id} className="border-b border-gray-200 dark:border-slate-700 pb-8 last:border-b-0 last:pb-0">
                                <div className="flex items-start gap-4">
                                    {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" /> : <XCircleIcon className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start gap-4">
                                            <p className="font-semibold text-gray-800 dark:text-white flex-grow">{index + 1}. {q.text}</p>
                                            <AudioPlayer textToSpeak={`${q.text}. Explicação: ${q.explanation}`} />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Domínio: {q.domain}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pl-10 space-y-2">
                                    {q.options.map(opt => {
                                        const isUserSelected = userAnswerForQ.includes(opt.id);
                                        const isCorrectAnswer = q.correctAnswers.includes(opt.id);

                                        let optionStyle = 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40';
                                        let label = null;

                                        if (isCorrectAnswer) {
                                            optionStyle = 'border-green-500/50 bg-green-500/10';
                                            if (isUserSelected) {
                                                label = <span className="text-xs font-semibold text-green-600 dark:text-green-300">Sua Resposta (Correta)</span>;
                                            } else {
                                                label = <span className="text-xs font-semibold text-green-600 dark:text-green-300">Resposta Correta</span>;
                                            }
                                        } else if (isUserSelected) {
                                            optionStyle = 'border-red-500/50 bg-red-500/10';
                                            label = <span className="text-xs font-semibold text-red-600 dark:text-red-300">Sua Resposta</span>;
                                        }

                                        return (
                                            <div key={opt.id} className={`p-3 border ${optionStyle} rounded-md text-sm flex justify-between items-center gap-4`}>
                                                <p className="text-gray-700 dark:text-gray-300 flex-grow">{opt.text}</p>
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    {label && <div>{label}</div>}
                                                    <AudioPlayer textToSpeak={opt.text} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                 <div className="mt-4 pl-10 p-4 bg-gray-100 dark:bg-slate-800/50 rounded-md">
                                    <h4 className="font-semibold text-cyan-600 dark:text-cyan-400">Explicação</h4>
                                    <p className="text-gray-700 dark:text-gray-300 mt-2">{q.explanation}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AttemptDetailsView;