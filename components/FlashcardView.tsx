
import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { ArrowLeftIcon, RectangleStackIcon } from './icons';

interface FlashcardViewProps {
    onBack: () => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ onBack }) => {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('cortexFlashcards');
            if (saved) {
                setFlashcards(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load flashcards:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFlip = () => {
        setIsFlipped(prev => !prev);
    };

    const goToNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            // Pequeno atraso para permitir que o card vire de volta antes de mudar
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center p-8">
                <p>Carregando flashcards...</p>
            </div>
        );
    }

    if (flashcards.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700/50">
                    <RectangleStackIcon className="w-16 h-16 mx-auto text-gray-400" />
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Nenhum Flashcard Encontrado</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Gere flashcards a partir da tela de revisão de um exame para começar a estudar.
                    </p>
                    <button onClick={onBack} className="mt-6 flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];

    // Formata a resposta que pode conter quebras de linha e marcadores
    const formattedAnswer = currentCard.answer.split('\n').map((line, i) => (
        <p key={i} className="mb-2">{line.trim()}</p>
    ));

    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
            <div className="w-full flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar à Configuração
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revisão com Flashcards</h1>
            </div>

            <div className="w-full text-center text-gray-500 dark:text-gray-400 font-medium">
                <p>Flashcard {currentIndex + 1} de {flashcards.length}</p>
            </div>

            {/* O container com a perspectiva para o efeito 3D */}
            <div className="w-full h-96 [perspective:1000px]">
                <div
                    className={`relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                    onClick={handleFlip}
                    aria-label="Clique para virar o card"
                >
                    {/* Frente do Card */}
                    <div className="absolute w-full h-full bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 flex items-center justify-center [backface-visibility:hidden]">
                        <p className="text-xl text-center text-gray-800 dark:text-white" style={{ whiteSpace: 'pre-line' }}>{currentCard.question}</p>
                    </div>
                    {/* Verso do Card */}
                    <div className="absolute w-full h-full bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 overflow-y-auto [transform:rotateY(180deg)] [backface-visibility:hidden]">
                        <div className="text-left text-gray-700 dark:text-gray-300">
                            {formattedAnswer}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between w-full mt-4">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-base font-medium rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Anterior
                </button>
                <button onClick={goToNext} disabled={currentIndex === flashcards.length - 1} className="px-6 py-2 border border-transparent text-base font-bold rounded-md text-black bg-cyan-400 hover:bg-cyan-300 transition-colors shadow-lg hover:shadow-cyan-400/20">
                    Próxima
                </button>
            </div>
        </div>
    );
};

export default FlashcardView;
