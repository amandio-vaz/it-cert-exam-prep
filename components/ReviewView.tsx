
import React, { useState } from 'react';
import { Question, UserAnswer } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface ReviewViewProps {
    questions: Question[];
    userAnswers: UserAnswer;
    onBackToResults: () => void;
}

const ReviewView: React.FC<ReviewViewProps> = ({ questions, userAnswers, onBackToResults }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (questions.length === 0) {
        // This case should ideally not be reached if the button is disabled correctly
        return (
            <div className="text-center p-8 bg-slate-900/50 backdrop-blur-sm rounded-xl">
                <h2 className="text-2xl text-white">Nenhuma questão para revisar.</h2>
                <p className="text-gray-400 mt-2">Você acertou tudo. Ótimo trabalho!</p>
                <button onClick={onBackToResults} className="mt-6 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md transition-colors">
                    Voltar aos Resultados
                </button>
            </div>
        );
    }

    const question = questions[currentIndex];
    const userAnswer = userAnswers[question.id] || [];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    const goToNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <button onClick={onBackToResults} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar aos Resultados
                </button>
                <h1 className="text-2xl font-bold text-white">Modo de Revisão</h1>
            </div>
            
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full shadow-lg">
                <p className="text-sm text-cyan-400 font-semibold">{question.domain}</p>
                <p className="text-sm text-gray-400 mb-4">Revisando questão {currentIndex + 1} de {questions.length}</p>
                
                {question.scenario && <div className="mb-4 p-4 bg-slate-800/70 border border-slate-600/50 rounded-md text-gray-300 italic"><p>{question.scenario}</p></div>}
                
                <p className="text-lg text-white mb-6">{question.text}</p>
                
                <div className="space-y-3">
                    {question.options.map(opt => {
                        const isUserAnswer = userAnswer.includes(opt.id);
                        const isCorrectAnswer = question.correctAnswers.includes(opt.id);
                        
                        let styles = 'border-slate-700 bg-slate-800/50';
                        let icon = null;

                        if (isCorrectAnswer) {
                            styles = 'border-green-500/50 bg-green-500/10';
                            icon = <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />;
                        } else if (isUserAnswer) { // This will only be true for incorrect user answers
                            styles = 'border-red-500/50 bg-red-500/10';
                            icon = <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />;
                        }

                        return (
                            <div key={opt.id} className={`flex items-center gap-4 p-4 border rounded-lg ${styles}`}>
                                {icon ? icon : <div className="w-5 h-5 flex-shrink-0"></div>}
                                <span className="text-gray-200">{opt.text}</span>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-6 p-4 bg-slate-800/50 rounded-md">
                    <h4 className="font-semibold text-cyan-400">Explicação</h4>
                    <p className="text-gray-300 mt-2">{question.explanation}</p>
                </div>
            </div>

            <div className="flex justify-between w-full">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="px-6 py-2 border border-slate-600 text-base font-medium rounded-md text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Anterior
                </button>
                <button onClick={goToNext} disabled={currentIndex === questions.length - 1} className="px-6 py-2 border border-slate-600 text-base font-medium rounded-md text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Próxima
                </button>
            </div>
        </div>
    );
};

export default ReviewView;