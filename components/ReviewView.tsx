

import React, { useState } from 'react';
import { Question, UserAnswer } from '../types';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClipboardDocumentListIcon } from './icons';
import AudioPlayer from './AudioPlayer';

interface ReviewViewProps {
    questions: Question[];
    userAnswers: UserAnswer;
    onBackToResults: () => void;
}

const ReviewView: React.FC<ReviewViewProps> = ({ questions, userAnswers, onBackToResults }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flashcardMessage, setFlashcardMessage] = useState<string>('');

    const handleGenerateFlashcards = () => {
        const flashcards = questions.map(q => {
            const correctAnswerTexts = q.correctAnswers
                .map(correctId => {
                    const option = q.options.find(opt => opt.id === correctId);
                    return option ? `• ${option.text}` : '';
                })
                .filter(Boolean);

            return {
                question: q.scenario ? `${q.scenario}\n\n${q.text}` : q.text,
                answer: correctAnswerTexts.join('\n')
            };
        });

        try {
            localStorage.setItem('cortexFlashcards', JSON.stringify(flashcards));
            setFlashcardMessage(`✅ ${flashcards.length} flashcards gerados e salvos!`);
            setTimeout(() => setFlashcardMessage(''), 4000);
        } catch (error) {
            console.error("Falha ao salvar flashcards:", error);
            setFlashcardMessage("❌ Erro ao salvar os flashcards.");
            setTimeout(() => setFlashcardMessage(''), 4000);
        }
    };


    if (questions.length === 0) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-xl">
                <h2 className="text-2xl text-gray-900 dark:text-white">Nenhuma questão para revisar.</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Você acertou tudo. Ótimo trabalho!</p>
                <button onClick={onBackToResults} className="mt-6 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md transition-colors">
                    Voltar aos Resultados
                </button>
            </div>
        );
    }

    const question = questions[currentIndex];
    const userAnswer = userAnswers[question.id] || [];
    const isCorrect = question.correctAnswers.length === userAnswer.length && question.correctAnswers.every(val => userAnswer.includes(val));
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
                <button onClick={onBackToResults} className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar aos Resultados
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modo de Revisão</h1>
                 <div className="flex flex-col items-end min-w-[200px]">
                    <button
                        onClick={handleGenerateFlashcards}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white font-semibold rounded-md transition-colors shadow-lg hover:shadow-indigo-500/30 whitespace-nowrap"
                    >
                        <ClipboardDocumentListIcon className="w-5 h-5" />
                        Gerar Flashcards
                    </button>
                    {flashcardMessage ? (
                         <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 h-5 text-right fade-in">{flashcardMessage}</p>
                    ) : (
                         <div className="h-5 mt-2"></div>
                    )}
                </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 w-full shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold">{question.domain}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Revisando questão {currentIndex + 1} de {questions.length}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {isCorrect ? (
                            <span className="flex items-center gap-1.5 text-sm bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-500/30 font-semibold">
                                <CheckCircleIcon className="w-4 h-4" />
                                Correta
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-sm bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-3 py-1 rounded-full border border-red-200 dark:border-red-500/30 font-semibold">
                                <XCircleIcon className="w-4 h-4" />
                                Incorreta
                            </span>
                        )}
                         <AudioPlayer textToSpeak={question.scenario ? `${question.scenario}. ${question.text}` : question.text} />
                    </div>
                </div>

                {question.scenario && <div className="mb-4 p-4 bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-600/50 rounded-md text-gray-700 dark:text-gray-300 italic"><p>{question.scenario}</p></div>}
                
                <p className="text-lg text-gray-800 dark:text-white mb-4">{question.text}</p>
                
                <div className="space-y-3">
                    {question.options.map(opt => {
                        const isUserAnswer = userAnswer.includes(opt.id);
                        const isCorrectAnswer = question.correctAnswers.includes(opt.id);
                        
                        let styles = 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50';
                        let icon = null;

                        if (isCorrectAnswer) {
                            styles = 'border-green-500/50 bg-green-500/10';
                            icon = <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />;
                        } else if (isUserAnswer) { // This will only be true for incorrect user answers
                            styles = 'border-red-500/50 bg-red-500/10';
                            icon = <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />;
                        }

                        return (
                            <div key={opt.id} className={`flex items-center justify-between gap-4 p-4 border rounded-lg ${styles}`}>
                                <div className="flex items-center gap-4 flex-grow mr-4">
                                    {icon ? icon : <div className="w-5 h-5 flex-shrink-0"></div>}
                                    <span className="text-gray-700 dark:text-gray-200">{opt.text}</span>
                                </div>
                                <AudioPlayer textToSpeak={opt.text} />
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-6 p-4 bg-gray-100 dark:bg-slate-800/50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-cyan-600 dark:text-cyan-400">Explicação</h4>
                        <AudioPlayer textToSpeak={question.explanation} />
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">{question.explanation}</p>
                </div>
            </div>

            <div className="flex justify-between w-full">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-base font-medium rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Anterior
                </button>
                <button onClick={goToNext} disabled={currentIndex === questions.length - 1} className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-base font-medium rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Próxima
                </button>
            </div>
        </div>
    );
};

export default ReviewView;