
import React, { useState } from 'react';
import { ExamData, UserAnswer, Attempt } from '../types';
import { CheckCircleIcon, XCircleIcon, BookOpenIcon, ArrowPathIcon, MagnifyingGlassIcon } from './icons';

interface ResultsViewProps {
    examData: ExamData;
    userAnswers: UserAnswer;
    attempt: Attempt;
    history: Attempt[];
    onTryAgain: () => void;
    onGenerateStudyPlan: () => void;
    onStartReview: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ examData, userAnswers, attempt, history, onTryAgain, onGenerateStudyPlan, onStartReview }) => {
    const scoreColor = attempt.score >= 70 ? 'text-green-400' : 'text-red-400';
    const hasIncorrectAnswers = attempt.correctAnswers < attempt.totalQuestions;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 mb-8 text-center shadow-lg">
                <h1 className="text-3xl font-bold text-white mb-2">Resultados do Exame</h1>
                <p className="text-lg text-gray-400 mb-4">{examData.examName}</p>
                <div className="flex justify-center items-baseline gap-4">
                    <p className={`text-7xl font-bold ${scoreColor}`}>{attempt.score.toFixed(1)}%</p>
                    <p className="text-2xl text-gray-300">({attempt.correctAnswers} / {attempt.totalQuestions} corretas)</p>
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <button onClick={onGenerateStudyPlan} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-bold rounded-md text-black bg-cyan-400 hover:bg-cyan-300 transition-all duration-200 shadow-lg hover:shadow-cyan-400/30">
                    <BookOpenIcon className="w-5 h-5" />
                    Gerar Plano de Estudos
                </button>
                <button 
                    onClick={onStartReview} 
                    disabled={!hasIncorrectAnswers}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 shadow-lg hover:shadow-amber-600/30"
                >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    Revisar Incorretas
                </button>
                 <button onClick={onTryAgain} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 text-base font-medium rounded-md text-white hover:bg-slate-700 transition-colors">
                    <ArrowPathIcon className="w-5 h-5" />
                    Novo Exame
                </button>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-6">Revisão das Questões</h2>
                <div className="space-y-8">
                    {examData.questions.map((q, index) => {
                        const userAnswer = userAnswers[q.id] || [];
                        const isCorrect = q.correctAnswers.length === userAnswer.length && q.correctAnswers.every(val => userAnswer.includes(val));
                        return (
                            <div key={q.id} className="border-b border-slate-700 pb-8 last:border-b-0 last:pb-0">
                                <div className="flex items-start gap-4">
                                    {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" /> : <XCircleIcon className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />}
                                    <div>
                                        <p className="font-semibold text-white">{index + 1}. {q.text}</p>
                                        <p className="text-xs text-gray-400 mt-1">Domínio: {q.domain}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pl-10 space-y-2">
                                    {q.options.map(opt => {
                                        const isUserAnswer = userAnswer.includes(opt.id);
                                        const isCorrectAnswer = q.correctAnswers.includes(opt.id);

                                        let optionStyle = 'border-slate-700 bg-slate-800/40';
                                        let label = null;

                                        if (isCorrectAnswer) {
                                            optionStyle = 'border-green-500/50 bg-green-500/10';
                                            if (isUserAnswer) {
                                                label = <span className="text-xs font-semibold text-green-300">Sua Resposta (Correta)</span>;
                                            } else {
                                                label = <span className="text-xs font-semibold text-green-300">Resposta Correta</span>;
                                            }
                                        } else if (isUserAnswer) {
                                            optionStyle = 'border-red-500/50 bg-red-500/10';
                                            label = <span className="text-xs font-semibold text-red-300">Sua Resposta</span>;
                                        }

                                        return (
                                            <div key={opt.id} className={`p-3 border ${optionStyle} rounded-md text-sm flex justify-between items-center`}>
                                                <p className="text-gray-300 flex-grow pr-4">{opt.text}</p>
                                                {label && <div className="flex-shrink-0">{label}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                                 <div className="mt-4 pl-10 p-4 bg-slate-800/50 rounded-md">
                                    <h4 className="font-semibold text-cyan-400">Explicação</h4>
                                    <p className="text-gray-300 mt-2">{q.explanation}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ResultsView;