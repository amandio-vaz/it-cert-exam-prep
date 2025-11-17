import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ExamData, Question, UserAnswer, QuestionType, Attempt } from '../types';
import { generateQuestionTitle } from '../services/geminiService';
import AudioPlayer from './AudioPlayer';
import { ClockIcon, Squares2X2Icon, SquaresPlusIcon, XMarkIcon, BookOpenIcon, MagnifyingGlassIcon } from './icons';

interface ExamViewProps {
    examData: ExamData;
    onFinishExam: (answers: UserAnswer) => void;
    initialAnswers?: UserAnswer;
    initialTimeLeft?: number | null;
    attempts: Attempt[];
}

const QuestionCard: React.FC<{
    question: Question;
    userAnswer: string[];
    onAnswerChange: (answer: string[]) => void;
    questionNumber: number;
    totalQuestions: number;
    title: string;
    isTitleLoading: boolean;
}> = ({ question, userAnswer, onAnswerChange, questionNumber, totalQuestions, title, isTitleLoading }) => {

    const handleSingleChoiceChange = (optionId: string) => {
        onAnswerChange([optionId]);
    };
    
    const handleMultiChoiceChange = (optionId: string) => {
        const newAnswer = userAnswer.includes(optionId)
            ? userAnswer.filter(id => id !== optionId)
            : [...userAnswer, optionId];
        onAnswerChange(newAnswer);
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 w-full shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                   <p className="text-sm text-cyan-500 dark:text-cyan-400 font-semibold">{question.domain}</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Questão {questionNumber} de {totalQuestions}</p>
                </div>
                <AudioPlayer textToSpeak={question.scenario ? `${question.scenario}. ${question.text}` : question.text} />
            </div>

            {isTitleLoading ? (
                <div className="h-8 w-3/4 bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse mb-4"></div>
            ) : (
                title && <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
            )}
            
            {question.scenario && <div className="mb-4 p-4 bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-600/50 rounded-md text-gray-700 dark:text-gray-300 italic"><p>{question.scenario}</p></div>}
            
            <p className="text-lg text-gray-800 dark:text-white mb-4">{question.text}</p>
            
            <div className="space-y-4 mt-2 flex-grow">
                {question.options.map(option => {
                    const isChecked = userAnswer.includes(option.id);
                    const isMulti = question.type === QuestionType.MultipleChoice;
                    const inputType = isMulti ? 'checkbox' : 'radio';

                    return (
                        <div key={option.id} className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${isChecked ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20' : 'bg-gray-50 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500'}`}>
                            <label className="flex items-center cursor-pointer flex-grow">
                                <input
                                    type={inputType}
                                    name={question.id}
                                    value={option.id}
                                    checked={isChecked}
                                    onChange={() => isMulti ? handleMultiChoiceChange(option.id) : handleSingleChoiceChange(option.id)}
                                    className={`h-5 w-5 ${isMulti ? 'rounded' : 'rounded-full'} text-cyan-600 dark:text-cyan-500 bg-white dark:bg-slate-900 border-gray-400 dark:border-slate-600 focus:ring-cyan-500 focus:ring-offset-white dark:focus:ring-offset-slate-900`}
                                />
                                <span className="ml-4 text-gray-700 dark:text-gray-200">{option.text}</span>
                            </label>
                            <AudioPlayer textToSpeak={option.text} />
                        </div>
                    );
                })}
            </div>
             <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">{question.type === QuestionType.MultipleChoice ? "Selecione todas as opções aplicáveis." : "Selecione uma opção."}</p>
        </div>
    );
};

const QuestionJumpModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onJump: (index: number) => void;
    questions: Question[];
}> = ({ isOpen, onClose, onJump, questions }) => {
    const [jumpNumber, setJumpNumber] = useState('');
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

    const domains = [...new Set(questions.map(q => q.domain))];

    const handleJumpByNumber = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseInt(jumpNumber, 10);
        if (!isNaN(num) && num >= 1 && num <= questions.length) {
            onJump(num - 1);
            setJumpNumber('');
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white/95 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ir para...</h2>
                
                <form onSubmit={handleJumpByNumber} className="mb-6">
                    <label htmlFor="jump-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Pular para a questão nº</label>
                    <div className="flex gap-2">
                        <input
                            id="jump-input"
                            type="number"
                            min="1"
                            max={questions.length}
                            value={jumpNumber}
                            onChange={(e) => setJumpNumber(e.target.value)}
                            className="flex-grow bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-800 dark:text-gray-200 p-2 transition-colors"
                            placeholder={`1-${questions.length}`}
                            autoFocus
                        />
                        <button type="submit" className="px-4 py-2 border border-transparent font-semibold rounded-md text-black bg-cyan-400 hover:bg-cyan-300 transition-colors">
                            Ir
                        </button>
                    </div>
                </form>

                <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Navegar por Domínio</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {domains.map(domain => (
                            <button 
                                key={domain} 
                                onClick={() => setSelectedDomain(d => d === domain ? null : domain)}
                                className={`px-3 py-1.5 text-sm rounded-full transition-colors border ${selectedDomain === domain ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300' : 'bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                            >
                                {domain}
                            </button>
                        ))}
                    </div>

                    {selectedDomain && (
                        <div className="p-4 bg-gray-100 dark:bg-slate-800/50 rounded-md border border-gray-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                             <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Questões em "{selectedDomain}"</h4>
                             <div className="grid grid-cols-6 gap-2">
                                {questions.map((q, index) => {
                                    if (q.domain === selectedDomain) {
                                        return (
                                            <button 
                                                key={q.id}
                                                onClick={() => onJump(index)}
                                                className="flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-cyan-500 hover:text-black"
                                            >
                                                {index + 1}
                                            </button>
                                        )
                                    }
                                    return null;
                                })}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuestionNavigator: React.FC<{
    questions: Question[];
    current: number;
    answered: string[];
    onJump: (index: number) => void;
    onOpenJumpModal: () => void;
    onReorder: (dragIndex: number, dropIndex: number) => void;
}> = ({ questions, current, answered, onJump, onOpenJumpModal, onReorder }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const filteredQuestions = useMemo(() => {
        if (!searchQuery.trim()) {
            return questions.map((q, index) => ({ question: q, originalIndex: index }));
        }
        return questions
            .map((q, index) => ({ question: q, originalIndex: index }))
            .filter(({ question }) => 
                question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (question.scenario && question.scenario.toLowerCase().includes(searchQuery.toLowerCase()))
            );
    }, [questions, searchQuery]);

    const isSearchActive = searchQuery.trim() !== '';


    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
        if (isSearchActive) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', index.toString());
        setTimeout(() => setDraggingIndex(index), 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLButtonElement>, dropIndex: number) => {
        e.preventDefault();
        if (isSearchActive) return;

        const dragIndexStr = e.dataTransfer.getData('text/plain');
        if (dragIndexStr) {
            const dragIndex = parseInt(dragIndexStr, 10);
            onReorder(dragIndex, dropIndex);
        }
    };
    
    const handleDragEnd = () => {
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-4 sticky top-28 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Squares2X2Icon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                Navegação do Exame
            </h3>
             <div className="relative mb-4">
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar questões..."
                    className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-800 dark:text-gray-200 transition-colors"
                />
                 <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
            <div className="grid grid-cols-5 gap-2">
                {filteredQuestions.map(({ question, originalIndex }) => {
                    const isAnswered = answered.includes(question.id);
                    const isCurrent = originalIndex === current;
                    const isDragging = draggingIndex === originalIndex;
                    const isDragOver = dragOverIndex === originalIndex && draggingIndex !== originalIndex;

                    let buttonClass = `border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 ${isSearchActive ? 'cursor-pointer' : 'cursor-grab'}`;
                    
                    if (isCurrent) {
                        buttonClass = `bg-cyan-400 border-cyan-400 text-black font-bold ${isSearchActive ? 'cursor-pointer' : 'cursor-grab'}`;
                    }
                    
                    if (!isSearchActive) {
                        if (isDragging) {
                            buttonClass += " opacity-50 scale-105 rotate-3 cursor-grabbing";
                        } else if (isDragOver) {
                            buttonClass = "scale-110 bg-cyan-500/20 border-2 border-solid border-cyan-400 ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900";
                        }
                    }

                    return (
                        <button 
                            key={question.id} 
                            onClick={() => onJump(originalIndex)}
                            draggable={!isSearchActive}
                            onDragStart={(e) => handleDragStart(e, originalIndex)}
                            onDragEnter={() => setDragOverIndex(originalIndex)}
                            onDragLeave={() => setDragOverIndex(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, originalIndex)}
                            onDragEnd={handleDragEnd}
                            className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 text-sm ${buttonClass}`}
                            aria-label={`Ir para a questão ${originalIndex + 1}`}
                            aria-current={isCurrent ? 'page' : undefined}
                        >
                            {originalIndex + 1}
                            {isAnswered && (
                                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-green-500" title="Respondida"></span>
                            )}
                        </button>
                    )
                })}
            </div>
            <div className="mt-4">
                <button 
                    onClick={onOpenJumpModal} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <SquaresPlusIcon className="w-5 h-5" />
                    Ir para...
                </button>
            </div>
        </div>
    );
};


const ExamView: React.FC<ExamViewProps> = ({ examData, onFinishExam, initialAnswers = {}, initialTimeLeft = null, attempts }) => {
    const [answers, setAnswers] = useState<UserAnswer>(initialAnswers);
    const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
    const [animationClass, setAnimationClass] = useState('opacity-100');
    const [isReadingMode, setIsReadingMode] = useState(false);
    const [currentQuestionTitle, setCurrentQuestionTitle] = useState('');
    const [isTitleLoading, setIsTitleLoading] = useState(false);
    
    const titleCache = useRef<Map<string, string>>(new Map());
    const isMountedRef = useRef(true);
    
    const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(() => {
        const savedProgressRaw = localStorage.getItem('cortexExamProgress');
        if (savedProgressRaw) {
            try {
                const savedProgress = JSON.parse(savedProgressRaw);
                if (savedProgress.examData?.examCode === examData.examCode && savedProgress.orderedQuestionIds) {
                    const idOrder: string[] = savedProgress.orderedQuestionIds;
                    const questionMap = new Map(examData.questions.map(q => [q.id, q]));
                    const savedOrder = idOrder.map(id => questionMap.get(id)).filter((q): q is Question => !!q);
                    
                    if (savedOrder.length === examData.questions.length) {
                        return savedOrder;
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar ordem salva:", e);
            }
        }
        return examData.questions;
    });
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const TIME_PER_QUESTION_SECONDS = 90;
    const totalTimeSeconds = examData.questions.length * TIME_PER_QUESTION_SECONDS;
    const [timeLeft, setTimeLeft] = useState(initialTimeLeft !== null ? initialTimeLeft : totalTimeSeconds);
    
    const answersRef = useRef(answers);
    answersRef.current = answers;
    
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        const generateTitle = async () => {
            const currentQuestion = orderedQuestions[currentQuestionIndex];
            if (!currentQuestion) return;

            const questionId = currentQuestion.id;
            if (titleCache.current.has(questionId)) {
                setCurrentQuestionTitle(titleCache.current.get(questionId)!);
                return;
            }

            setIsTitleLoading(true);
            setCurrentQuestionTitle(''); 
            try {
                const fullText = currentQuestion.scenario ? `${currentQuestion.scenario}\n${currentQuestion.text}` : currentQuestion.text;
                const newTitle = await generateQuestionTitle(fullText);
                titleCache.current.set(questionId, newTitle);
                if (isMountedRef.current) {
                    setCurrentQuestionTitle(newTitle);
                }
            } catch (e) {
                console.error("Falha ao gerar o título da questão", e);
            } finally {
                if (isMountedRef.current) {
                    setIsTitleLoading(false);
                }
            }
        };

        generateTitle();
    }, [currentQuestionIndex, orderedQuestions]);


    useEffect(() => {
        if (timeLeft <= 0) return;

        const progressToSave = {
            appState: 'taking_exam',
            examData: examData,
            userAnswers: answers,
            timeLeft: timeLeft,
            orderedQuestionIds: orderedQuestions.map(q => q.id),
            attempts: attempts,
        };
        localStorage.setItem('cortexExamProgress', JSON.stringify(progressToSave));

    }, [answers, timeLeft, orderedQuestions, examData, attempts]);


    const playWarningSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 880;

        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
    };

    useEffect(() => {
        if (isReadingMode) return; 

        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime === 121 || prevTime === 61 || prevTime === 31) {
                    playWarningSound();
                }
                if (prevTime <= 1) {
                    clearInterval(timer);
                    onFinishExam(answersRef.current);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onFinishExam, isReadingMode]);
    
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const getTimerClasses = () => {
        if (timeLeft <= 120) return 'text-red-500 dark:text-red-400 border-red-500/60 animate-pulse';
        if (timeLeft <= 300) return 'text-amber-500 dark:text-amber-400 border-amber-500/60';
        return 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-700/50';
    };


    const handleAnswerChange = (answer: string[]) => {
        setAnswers(prev => ({
            ...prev,
            [orderedQuestions[currentQuestionIndex].id]: answer,
        }));
    };

    const navigateToQuestionWithAnimation = (index: number) => {
        if (index < 0 || index >= orderedQuestions.length || index === currentQuestionIndex) return;

        setAnimationClass('opacity-0'); 

        setTimeout(() => {
            setCurrentQuestionIndex(index);
            setAnimationClass('opacity-100'); 
        }, 200); 
    };

    const handleJumpToQuestion = (index: number) => {
        navigateToQuestionWithAnimation(index);
    };
    
    const handleJumpFromModal = (index: number) => {
        navigateToQuestionWithAnimation(index);
        setIsJumpModalOpen(false);
    };

    const goToNext = () => {
        navigateToQuestionWithAnimation(currentQuestionIndex + 1);
    };

    const goToPrev = () => {
        navigateToQuestionWithAnimation(currentQuestionIndex - 1);
    };
    
    const handleReorder = (dragIndex: number, dropIndex: number) => {
        if (dragIndex === dropIndex) return;
        
        const currentQuestionId = orderedQuestions[currentQuestionIndex].id;
        
        const newOrderedQuestions = [...orderedQuestions];
        const [draggedItem] = newOrderedQuestions.splice(dragIndex, 1);
        newOrderedQuestions.splice(dropIndex, 0, draggedItem);
        
        setOrderedQuestions(newOrderedQuestions);
        
        const newCurrentIndex = newOrderedQuestions.findIndex(q => q.id === currentQuestionId);
        if (newCurrentIndex !== -1) {
            setCurrentQuestionIndex(newCurrentIndex);
        }
    };
    
    const progress = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;
    const currentQuestion = orderedQuestions[currentQuestionIndex];

    return (
        <>
            <div className="flex flex-col items-center gap-6">
                <div className="w-full max-w-7xl">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-left">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{examData.examName}</h1>
                            <h2 className="text-lg text-gray-500 dark:text-gray-400">{examData.examCode}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsReadingMode(!isReadingMode)}
                                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                                aria-label={isReadingMode ? "Sair do Modo de Leitura" : "Entrar no Modo de Leitura"}
                                title={isReadingMode ? "Sair do Modo de Leitura" : "Entrar no Modo de Leitura"}
                            >
                                <BookOpenIcon className={`w-6 h-6 ${isReadingMode ? 'text-cyan-400' : ''}`} />
                            </button>

                            {!isReadingMode && (
                                <div className={`flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border px-3 py-1.5 rounded-lg transition-colors duration-500 ${getTimerClasses()}`}>
                                    <ClockIcon className="w-5 h-5" />
                                    <span className="font-mono text-lg font-semibold">{formatTime(timeLeft)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {!isReadingMode && (
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </div>

                <div className={`w-full max-w-7xl grid grid-cols-1 ${!isReadingMode && 'md:grid-cols-3'} gap-8`}>
                    <div className={`flex flex-col gap-6 ${!isReadingMode ? 'md:col-span-2' : 'col-span-1'}`}>
                        <div className={`transition-opacity duration-200 ease-in-out ${animationClass}`}>
                             {currentQuestion && <QuestionCard
                                key={currentQuestion.id}
                                question={currentQuestion}
                                userAnswer={answers[currentQuestion.id] || []}
                                onAnswerChange={handleAnswerChange}
                                questionNumber={currentQuestionIndex + 1}
                                totalQuestions={orderedQuestions.length}
                                title={currentQuestionTitle}
                                isTitleLoading={isTitleLoading}
                            />}
                        </div>

                         {!isReadingMode && (
                            <div className="flex justify-between w-full">
                                <button onClick={goToPrev} disabled={currentQuestionIndex === 0} className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-base font-medium rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    Anterior
                                </button>
                                {currentQuestionIndex < orderedQuestions.length - 1 ? (
                                    <button onClick={goToNext} className="px-6 py-2 border border-transparent text-base font-bold rounded-md text-black bg-cyan-400 hover:bg-cyan-300 transition-colors shadow-lg hover:shadow-cyan-400/20">
                                        Próxima
                                    </button>
                                ) : (
                                    <button onClick={() => onFinishExam(answers)} className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg hover:shadow-green-600/30">
                                        Finalizar Exame
                                    </button>
                                )}
                            </div>
                         )}
                    </div>
                    {!isReadingMode && (
                        <div className="md:col-span-1">
                            <QuestionNavigator 
                                questions={orderedQuestions}
                                current={currentQuestionIndex}
                                answered={Object.keys(answers).filter(key => answers[key] && answers[key].length > 0)}
                                onJump={handleJumpToQuestion}
                                onOpenJumpModal={() => setIsJumpModalOpen(true)}
                                onReorder={handleReorder}
                            />
                        </div>
                    )}
                </div>
            </div>
            <QuestionJumpModal
                isOpen={isJumpModalOpen}
                onClose={() => setIsJumpModalOpen(false)}
                onJump={handleJumpFromModal}
                questions={orderedQuestions}
            />
        </>
    );
};

export default ExamView;