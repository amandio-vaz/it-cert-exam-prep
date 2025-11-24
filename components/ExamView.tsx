
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ExamData, Question, UserAnswer, QuestionType, Attempt } from '../types';
import { generateQuestionTitle } from '../services/geminiService';
import AudioPlayer from './AudioPlayer';
import { ClockIcon, Squares2X2Icon, SquaresPlusIcon, XMarkIcon, BookOpenIcon, MagnifyingGlassIcon, BookmarkIcon, InformationCircleIcon } from './icons';

interface ExamViewProps {
    examData: ExamData;
    onFinishExam: (answers: UserAnswer) => void;
    initialAnswers?: UserAnswer;
    initialTimeLeft?: number | null;
    attempts: Attempt[]; // Adicionado: histórico de tentativas para salvar no progresso
    initialQuestionIndex?: number | null; // NOVO: Índice da questão a ser restaurada
    initialOrderedQuestions?: Question[] | null; // NOVO: Ordem das questões a ser restaurada
    initialFlaggedQuestions?: string[] | null; // NOVO: Questões sinalizadas a serem restauradas
}

const getQuestionTypeExplanation = (type: QuestionType): string => {
    switch (type) {
        case QuestionType.SingleChoice:
            return "Escolha Única: Apenas uma opção pode ser selecionada como correta.";
        case QuestionType.MultipleChoice:
            return "Múltipla Escolha: Uma ou mais opções podem ser selecionadas como corretas.";
        case QuestionType.Scenario:
            return "Baseada em Cenário: Leia o cenário com atenção antes de responder.";
        case QuestionType.TrueFalse:
            return "Verdadeiro ou Falso: Determine se a afirmação é verdadeira ou falsa.";
        default:
            return "Tipo de questão padrão.";
    }
};

const QuestionCard: React.FC<{
    question: Question;
    userAnswer: string[];
    onAnswerChange: (answer: string[]) => void;
    questionNumber: number;
    totalQuestions: number;
    title: string;
    isTitleLoading: boolean;
    isFlagged: boolean;
    onToggleFlag: () => void;
    isNavigationDisabled: boolean; // NOVO: para desabilitar opções durante transição de questão
}> = ({ question, userAnswer, onAnswerChange, questionNumber, totalQuestions, title, isTitleLoading, isFlagged, onToggleFlag, isNavigationDisabled }) => { // NOVO prop

    const handleSingleChoiceChange = (optionId: string) => {
        if (isNavigationDisabled) return; // Desabilita mudança de resposta durante transição
        onAnswerChange([optionId]);
    };
    
    const handleMultiChoiceChange = (optionId: string) => {
        if (isNavigationDisabled) return; // Desabilita mudança de resposta durante transição
        const newAnswer = userAnswer.includes(optionId)
            ? userAnswer.filter(id => id !== optionId)
            : [...userAnswer, optionId];
        onAnswerChange(newAnswer);
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 w-full shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                   <p className="text-sm text-cyan-500 dark:text-cyan-400 font-semibold">{question.domain}</p>
                   <div className="flex items-center gap-2">
                     <p className="text-sm text-gray-500 dark:text-gray-400">Questão {questionNumber} de {totalQuestions}</p>
                     <div className="relative group">
                            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-gray-200 bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible z-10">
                                {getQuestionTypeExplanation(question.type)}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                            </div>
                        </div>
                   </div>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={onToggleFlag} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors" title={isFlagged ? "Remover sinalização" : "Sinalizar para revisão"} disabled={isNavigationDisabled}>
                        <BookmarkIcon className={`w-6 h-6 ${isFlagged ? 'text-amber-500 fill-current' : ''}`} />
                    </button>
                    {/* Fix: Pass the disabled prop to AudioPlayer */}
                    <AudioPlayer textToSpeak={question.scenario ? `${question.scenario}. ${question.text}` : question.text} disabled={isNavigationDisabled} />
                </div>
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
                        <div key={option.id} className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${isChecked ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20' : 'bg-gray-50 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500'} ${isNavigationDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <label className="flex items-center flex-grow">
                                <input
                                    type={inputType}
                                    name={question.id}
                                    value={option.id}
                                    checked={isChecked}
                                    onChange={() => isMulti ? handleMultiChoiceChange(option.id) : handleSingleChoiceChange(option.id)}
                                    className={`h-5 w-5 ${isMulti ? 'rounded' : 'rounded-full'} text-cyan-600 dark:text-cyan-500 bg-white dark:bg-slate-900 border-gray-400 dark:border-slate-600 focus:ring-cyan-500 focus:ring-offset-white dark:focus:ring-offset-slate-900`}
                                    disabled={isNavigationDisabled} // Desabilita input durante transição
                                />
                                <span className="ml-4 text-gray-700 dark:text-gray-200">{option.text}</span>
                            </label>
                            {/* Fix: Pass the disabled prop to AudioPlayer */}
                            <AudioPlayer textToSpeak={option.text} disabled={isNavigationDisabled} />
                        </div>
                    );
                })}
            </div>
             <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">{question.type === QuestionType.MultipleChoice ? "Selecione todas as opções aplicáveis." : "Selecione uma opção."}</p>
        </div>
    );
};

type FilterStatus = 'all' | 'answered' | 'unanswered' | 'flagged';

const QuestionJumpModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onJump: (index: number) => void;
    questions: Question[];
    answered: string[];
    flagged: string[];
    isNavigationDisabled: boolean; // NOVO: para desabilitar navegação durante transição
}> = ({ isOpen, onClose, onJump, questions, answered, flagged, isNavigationDisabled }) => { // NOVO prop
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    
    // Extrai domínios únicos das questões
    const domains = useMemo(() => [...new Set(questions.map(q => q.domain || 'Geral'))].sort(), [questions]);

    const filteredQuestions = useMemo(() => {
        return questions.map((q, index) => ({ question: q, originalIndex: index }))
            .filter(({ question }) => {
                // Filtro por domínio
                const domainMatch = !selectedDomain || (question.domain || 'Geral') === selectedDomain;
                if (!domainMatch) return false;

                // Filtro por status
                switch (filterStatus) {
                    case 'answered': return answered.includes(question.id);
                    case 'unanswered': return !answered.includes(question.id);
                    case 'flagged': return flagged.includes(question.id);
                    case 'all':
                    default: return true;
                }
            });
    }, [questions, selectedDomain, filterStatus, answered, flagged]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white/95 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-slide-up flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ir para Questão</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors" disabled={isNavigationDisabled}>
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                 <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Filtrar por Status</h3>
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'answered', 'unanswered', 'flagged'] as FilterStatus[]).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 text-sm rounded-full transition-colors border ${filterStatus === status ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300' : 'bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                                disabled={isNavigationDisabled} // Desabilita botão durante transição
                            >
                                { {all: 'Todas', answered: 'Respondidas', unanswered: 'Não Respondidas', flagged: 'Sinalizadas'}[status] }
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Filtrar por Domínio</h3>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                        {domains.map(domain => (
                            <button 
                                key={domain} 
                                onClick={() => setSelectedDomain(d => d === domain ? null : domain)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border whitespace-nowrap ${selectedDomain === domain ? 'bg-violet-500/20 border-violet-500 text-violet-600 dark:text-violet-300' : 'bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                                disabled={isNavigationDisabled} // Desabilita botão durante transição
                            >
                                {domain}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-100 dark:bg-slate-800/50 rounded-md border border-gray-200 dark:border-slate-700 overflow-y-auto flex-grow custom-scrollbar">
                     <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                        {filteredQuestions.map(({ question, originalIndex }) => {
                             const isAnswered = answered.includes(question.id);
                             const isFlagged = flagged.includes(question.id);
                            return (
                                <button 
                                    key={question.id}
                                    onClick={() => onJump(originalIndex)}
                                    className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 text-sm border bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-cyan-400 hover:text-black hover:scale-105 ${isFlagged ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-300 dark:border-slate-600'}`}
                                    disabled={isNavigationDisabled} // Desabilita botão durante transição
                                >
                                    {originalIndex + 1}
                                    {isAnswered && !isFlagged && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-green-500"></span>}
                                    {isFlagged && <span className="absolute -top-1 -right-1 text-amber-500"><BookmarkIcon className="w-3 h-3 fill-current" /></span>}
                                </button>
                            );
                        })}
                     </div>
                     {filteredQuestions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                            <MagnifyingGlassIcon className="w-8 h-8 mb-2 opacity-50" />
                            <p>Nenhuma questão encontrada com os filtros selecionados.</p>
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
    flagged: string[];
    onJump: (index: number) => void;
    onOpenJumpModal: () => void;
    onReorder: (dragIndex: number, dropIndex: number) => void; // Add onReorder prop
    isNavigationDisabled: boolean; // NOVO: para desabilitar navegação durante transição
}> = ({ questions, current, answered, flagged, onJump, onOpenJumpModal, onReorder, isNavigationDisabled }) => { // NOVO prop
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
        if (isSearchActive || isNavigationDisabled) { // Desabilita arrastar durante transição ou busca ativa
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
        if (isSearchActive || isNavigationDisabled) return; // Desabilita soltar durante transição ou busca ativa

        const dragIndexStr = e.dataTransfer.getData('text/plain');
        if (dragIndexStr) {
            const dragIndex = parseInt(dragIndexStr, 10);
            onReorder(dragIndex, dropIndex);
            setDragOverIndex(null); // Clear dragOverIndex on drop
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
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar questões..."
                    className="w-full pl-8 pr-8 py-1.5 text-sm bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-800 dark:text-gray-200 transition-colors"
                    disabled={isNavigationDisabled} // Desabilita input durante transição
                />
                 {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Limpar busca"
                        disabled={isNavigationDisabled} // Desabilita botão durante transição
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="grid grid-cols-5 gap-2">
                {filteredQuestions.map(({ question, originalIndex }) => {
                    const isAnswered = answered.includes(question.id);
                    const isCurrent = originalIndex === current;
                    const isFlagged = flagged.includes(question.id);
                    const isDraggingThis = draggingIndex === originalIndex;
                    const isDragOverThis = dragOverIndex === originalIndex && draggingIndex !== originalIndex;

                    let buttonClass = `border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 ${isSearchActive ? 'cursor-pointer' : 'cursor-grab'} ${isFlagged ? 'border-amber-500' : 'border-gray-300 dark:border-slate-700'}`;
                    
                    if (isCurrent) {
                        buttonClass = `bg-cyan-400 border-cyan-400 text-black font-bold ${isSearchActive ? 'cursor-pointer' : 'cursor-grab'}`;
                    }
                    
                    if (!isSearchActive) {
                        if (isDraggingThis) {
                            buttonClass += " opacity-50 scale-105 rotate-3 cursor-grabbing";
                        } else if (isDragOverThis) {
                            buttonClass = "scale-110 bg-cyan-500/20 border-2 border-solid border-cyan-400 ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900";
                        }
                    }

                    return (
                        <button 
                            key={question.id} 
                            onClick={() => onJump(originalIndex)}
                            draggable={!isSearchActive && !isNavigationDisabled} // Desabilita arrastar durante transição ou busca ativa
                            onDragStart={(e) => handleDragStart(e, originalIndex)}
                            onDragEnter={() => !isDraggingThis && setDragOverIndex(originalIndex)} // Prevent self-drag-over
                            onDragLeave={() => setDragOverIndex(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, originalIndex)}
                            onDragEnd={handleDragEnd}
                            className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 text-sm ${buttonClass}`}
                            aria-label={`Ir para a questão ${originalIndex + 1}`}
                            aria-current={isCurrent ? 'page' : undefined}
                            disabled={isNavigationDisabled} // Desabilita botão durante transição
                        >
                            {originalIndex + 1}
                            {isAnswered && !isFlagged && (
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
                    disabled={isNavigationDisabled} // Desabilita botão durante transição
                >
                    <SquaresPlusIcon className="w-5 h-5" />
                    Ir para...
                </button>
            </div>
        </div>
    );
};

// Utility function to format time
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const ExamView: React.FC<ExamViewProps> = ({ 
    examData, 
    onFinishExam, 
    initialAnswers = {}, 
    initialTimeLeft = null, 
    attempts,
    initialQuestionIndex = null, // Valor padrão para a nova prop
    initialOrderedQuestions = null, // Valor padrão para a nova prop
    initialFlaggedQuestions = null, // Valor padrão para a nova prop
}) => {
    const [answers, setAnswers] = useState<UserAnswer>(initialAnswers);
    const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
    const [animationClass, setAnimationClass] = useState('opacity-100 translate-y-0'); // Estado inicial da animação
    const [animationKey, setAnimationKey] = useState(0); // Novo estado para forçar remount da animação
    const [isTransitioning, setIsTransitioning] = useState(false); // NOVO: para desabilitar botões durante transição
    const [isReadingMode, setIsReadingMode] = useState(false);
    const [currentQuestionTitle, setCurrentQuestionTitle] = useState('');
    const [isTitleLoading, setIsTitleLoading] = useState(false);
    
    // Inicializa estados a partir das props ou valores padrão
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
        initialQuestionIndex !== null ? initialQuestionIndex : 0
    );
    const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(
        initialOrderedQuestions !== null ? initialOrderedQuestions : examData.questions
    );
    const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>(
        initialFlaggedQuestions !== null ? initialFlaggedQuestions : []
    );
    
    const titleCache = useRef<Map<string, string>>(new Map());
    const isMountedRef = useRef(true);
    
    const TIME_PER_QUESTION_SECONDS = 90;
    const totalTimeSeconds = examData.questions.length * TIME_PER_QUESTION_SECONDS;
    const [timeLeft, setTimeLeft] = useState(initialTimeLeft !== null ? initialTimeLeft : totalTimeSeconds);
    
    const answersRef = useRef(answers);
    answersRef.current = answers;
    
    // Animação de entrada do ExamView como um todo
    const [examViewMounted, setExamViewMounted] = useState(false);
    useEffect(() => {
        setExamViewMounted(true);
        // Opcional: resetar para false ao desmontar, se necessário, mas para entry animation, só precisa de true uma vez.
    }, []);

    // Fix: Declared handleFinishExam before its usage in useEffect
    const handleFinishExamCallback = useCallback(() => {
        onFinishExam(answersRef.current); // Use ref to get latest answers
    }, [onFinishExam]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Effect to reset and start entry animation for new questions
    useEffect(() => {
        // Only trigger entry animation if not in the middle of a transition out
        if (!isTransitioning) {
            setAnimationClass('opacity-0 translate-y-4'); // Set initial hidden state (slide up from below)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { // Double rAF for robustness
                    if (isMountedRef.current) {
                        setAnimationClass('opacity-100 translate-y-0'); // Then animate to visible and original position
                    }
                });
            });
        }
    }, [currentQuestionIndex, animationKey, isTransitioning, isMountedRef]);


    // Function to pre-fetch title for the next question (without setting UI state)
    const prefetchTitle = useCallback(async (index: number) => {
        if (index < 0 || index >= orderedQuestions.length) return;
        const q = orderedQuestions[index];
        if (!q) return;
        if (titleCache.current.has(q.id)) return; // Already cached

        try {
            const fullText = q.scenario ? `${q.scenario}\n${q.text}` : q.text;
            const newTitle = await generateQuestionTitle(fullText);
            titleCache.current.set(q.id, newTitle);
        } catch (e) {
            // Silent fail for prefetch is fine
            // console.warn("Prefetch failed for index " + index);
        }
    }, [orderedQuestions]);

    useEffect(() => {
        const loadTitles = async () => {
            const currentQuestion = orderedQuestions[currentQuestionIndex];
            if (!currentQuestion) return;

            const questionId = currentQuestion.id;
            
            // 1. Load CURRENT question title (Update UI)
            if (titleCache.current.has(questionId)) {
                if (isMountedRef.current) {
                    setCurrentQuestionTitle(titleCache.current.get(questionId)!);
                }
            } else {
                if (isMountedRef.current) setIsTitleLoading(true);
                if (isMountedRef.current) setCurrentQuestionTitle(''); 
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
            }

            // 2. Pre-fetch NEXT question title (Background)
            // Small delay to prioritize the main thread for the current question's UI updates
            setTimeout(() => {
                if (isMountedRef.current) {
                    prefetchTitle(currentQuestionIndex + 1);
                }
            }, 500);
        };

        loadTitles();
    }, [currentQuestionIndex, orderedQuestions, prefetchTitle]);


    useEffect(() => {
        if (timeLeft <= 0) return;

        const progressToSave = {
            appState: 'taking_exam',
            examData: examData,
            userAnswers: answers,
            timeLeft: timeLeft,
            currentQuestionIndex: currentQuestionIndex, // ADICIONADO: Salva o índice da questão atual
            orderedQuestionIds: orderedQuestions.map(q => q.id),
            flaggedQuestions: flaggedQuestions,
            attempts: attempts,
        };
        localStorage.setItem('cortexExamProgress', JSON.stringify(progressToSave));

    }, [answers, timeLeft, orderedQuestions, examData, attempts, flaggedQuestions, currentQuestionIndex]);


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
        oscillator.start(now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        oscillator.stop(now + 0.5);
    };

    // Timer effect
    useEffect(() => {
        if (timeLeft <= 0) {
            handleFinishExamCallback();
            return;
        }

        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                setTimeLeft(prevTime => prevTime - 1);
                if (timeLeft === 60 || timeLeft === 300) { // 5 minutes or 1 minute remaining
                    playWarningSound();
                }
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [timeLeft, handleFinishExamCallback]);


    const handleAnswerChange = useCallback((questionId: string, newAnswer: string[]) => {
        setAnswers(prev => ({ ...prev, [questionId]: newAnswer }));
    }, []);

    const handleToggleFlag = useCallback((questionId: string) => {
        setFlaggedQuestions(prev =>
            prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
        );
    }, []);


    const handleJumpToQuestion = useCallback((index: number) => {
        if (index === currentQuestionIndex || isTransitioning || !isMountedRef.current) return;
        setIsTransitioning(true);
        setAnimationClass('opacity-0 translate-y-4'); // Start exit animation (slide down)
        setTimeout(() => {
            if (isMountedRef.current) {
                setCurrentQuestionIndex(index);
                setAnimationKey(prev => prev + 1); // Change key to remount QuestionCard for entry animation
                setIsJumpModalOpen(false);
                // Entry animation will be triggered by useEffect
                setTimeout(() => {
                    if (isMountedRef.current) setIsTransitioning(false);
                }, 300); // End transition state after entry animation completes
            }
        }, 300); // Duration of exit animation
    }, [currentQuestionIndex, isTransitioning]);

    const goToNextQuestion = useCallback(() => {
        if (currentQuestionIndex < orderedQuestions.length - 1 && !isTransitioning && isMountedRef.current) {
            setIsTransitioning(true);
            setAnimationClass('opacity-0 translate-y-4'); // Start exit animation (slide down)
            setTimeout(() => {
                if (isMountedRef.current) {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setAnimationKey(prev => prev + 1); // Change key to remount QuestionCard for entry animation
                    // Entry animation will be triggered by useEffect
                    setTimeout(() => {
                        if (isMountedRef.current) setIsTransitioning(false);
                    }, 300); // End transition state after entry animation completes
                }
            }, 300); // Duration of exit animation
        }
    }, [currentQuestionIndex, orderedQuestions.length, isTransitioning]);

    const goToPrevQuestion = useCallback(() => {
        if (currentQuestionIndex > 0 && !isTransitioning && isMountedRef.current) {
            setIsTransitioning(true);
            setAnimationClass('opacity-0 translate-y-4'); // Start exit animation (slide down)
            setTimeout(() => {
                if (isMountedRef.current) {
                    setCurrentQuestionIndex(prev => prev - 1);
                    setAnimationKey(prev => prev + 1); // Change key to remount QuestionCard for entry animation
                    // Entry animation will be triggered by useEffect
                    setTimeout(() => {
                        if (isMountedRef.current) setIsTransitioning(false);
                    }, 300); // End transition state after entry animation completes
                }
            }, 300); // Duration of exit animation
        }
    }, [currentQuestionIndex, isTransitioning]); // Fix: Added closing parenthesis for useCallback

    const handleReorderQuestions = useCallback((dragIndex: number, dropIndex: number) => {
        if (isTransitioning || !isMountedRef.current) return;
        setOrderedQuestions(prevQuestions => {
            const newQuestions = [...prevQuestions];
            const [reorderedItem] = newQuestions.splice(dragIndex, 1);
            newQuestions.splice(dropIndex, 0, reorderedItem);
            return newQuestions;
        });
        // If the current question was moved, update its index
        if (dragIndex === currentQuestionIndex) {
            if (isMountedRef.current) setCurrentQuestionIndex(dropIndex);
        } else if (dragIndex < currentQuestionIndex && dropIndex >= currentQuestionIndex) {
            if (isMountedRef.current) setCurrentQuestionIndex(prev => prev + 1);
        } else if (dragIndex > currentQuestionIndex && dropIndex <= currentQuestionIndex) {
            if (isMountedRef.current) setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [currentQuestionIndex, isTransitioning]);

    const handleConfirmFinish = useCallback(() => {
        if (window.confirm('Tem certeza de que deseja finalizar o exame?')) {
            handleFinishExamCallback();
        }
    }, [handleFinishExamCallback]);


    const currentQuestion = orderedQuestions[currentQuestionIndex];
    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-gray-900 dark:to-black">
                <p className="text-xl text-gray-700 dark:text-gray-300">Carregando questões...</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col min-h-screen p-4 md:p-8 bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-gray-900 dark:to-black transition-opacity duration-500 ${examViewMounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex-grow max-w-7xl mx-auto w-full">
                {/* Timer and Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{examData.examName}</h1>
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
                        <ClockIcon className="w-6 h-6" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {/* Main Content Area: Question and Navigator */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Question Card */}
                    <div className="md:col-span-2">
                        <div className={`transition-all duration-300 ease-in-out transform ${animationClass}`}>
                            <QuestionCard
                                key={`${currentQuestion.id}-${animationKey}`} // Key to force remount for animation
                                question={currentQuestion}
                                userAnswer={answers[currentQuestion.id] || []}
                                onAnswerChange={(newAnswer) => handleAnswerChange(currentQuestion.id, newAnswer)}
                                questionNumber={currentQuestionIndex + 1}
                                totalQuestions={orderedQuestions.length}
                                title={currentQuestionTitle}
                                isTitleLoading={isTitleLoading}
                                isFlagged={flaggedQuestions.includes(currentQuestion.id)}
                                onToggleFlag={() => handleToggleFlag(currentQuestion.id)}
                                isNavigationDisabled={isTransitioning}
                            />
                        </div>
                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6">
                            <button
                                onClick={goToPrevQuestion}
                                disabled={currentQuestionIndex === 0 || isTransitioning}
                                className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-base font-medium rounded-xl text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Anterior
                            </button>
                            {currentQuestionIndex === orderedQuestions.length - 1 ? (
                                <button
                                    onClick={handleConfirmFinish}
                                    disabled={isTransitioning}
                                    className="px-6 py-3 border border-transparent text-base font-bold rounded-xl text-black bg-green-500 hover:bg-green-400 disabled:bg-slate-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-green-500/30"
                                >
                                    Finalizar Exame
                                </button>
                            ) : (
                                <button
                                    onClick={goToNextQuestion}
                                    disabled={isTransitioning}
                                    className="px-6 py-3 border border-transparent text-base font-bold rounded-xl text-black bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-cyan-500/30"
                                >
                                    Próxima
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Question Navigator */}
                    <div className="md:col-span-1">
                        <QuestionNavigator
                            questions={orderedQuestions}
                            current={currentQuestionIndex}
                            answered={Object.keys(answers)}
                            flagged={flaggedQuestions}
                            onJump={handleJumpToQuestion}
                            onOpenJumpModal={() => setIsJumpModalOpen(true)}
                            onReorder={handleReorderQuestions}
                            isNavigationDisabled={isTransitioning}
                        />
                    </div>
                </div>
            </div>

            {/* Jump Modal */}
            <QuestionJumpModal
                isOpen={isJumpModalOpen}
                onClose={() => setIsJumpModalOpen(false)}
                onJump={handleJumpToQuestion}
                questions={orderedQuestions}
                answered={Object.keys(answers)}
                flagged={flaggedQuestions}
                isNavigationDisabled={isTransitioning}
            />

            {/* Finish Confirmation Modal is handled inline via window.confirm */}
        </div>
    );
};

export default ExamView;
