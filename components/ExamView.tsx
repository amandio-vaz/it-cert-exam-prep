

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExamData, Question, UserAnswer, QuestionType, Attempt } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { PlayIcon, PauseIcon, ClockIcon, Squares2X2Icon, SquaresPlusIcon, XMarkIcon, SpeakerWaveIcon } from './icons';

interface ExamViewProps {
    examData: ExamData;
    onFinishExam: (answers: UserAnswer) => void;
    initialAnswers?: UserAnswer;
    initialTimeLeft?: number | null;
    attempts: Attempt[];
}

// Player de áudio aprimorado, definido dentro do ExamView para simplicidade.
const AudioPlayer: React.FC<{ textToSpeak: string }> = ({ textToSpeak }) => {
    type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

    const [audioState, setAudioState] = useState<AudioState>('idle');
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Usamos refs para armazenar objetos que não devem disparar re-renderizações ao serem alterados.
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const startTimeRef = useRef(0);
    const pauseTimeRef = useRef(0);
    const animationFrameRef = useRef(0);

    const cleanup = () => {
        // Para a animação e o áudio.
        cancelAnimationFrame(animationFrameRef.current);
        sourceNodeRef.current?.stop();
        sourceNodeRef.current?.disconnect();
        // Não fechamos o context para permitir múltiplos plays
    };
    
    // Efeito para limpar ao desmontar o componente (ex: mudar de questão)
    useEffect(() => {
        return () => {
            cleanup();
            audioContextRef.current?.close();
        }
    }, []);

    const formatTime = (seconds: number) => {
        const floorSeconds = Math.floor(seconds);
        const min = Math.floor(floorSeconds / 60);
        const sec = floorSeconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const updateProgress = useCallback(() => {
        if (audioContextRef.current && audioState === 'playing') {
            const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
            if (elapsed < duration) {
                setCurrentTime(elapsed);
                setProgress(elapsed / duration);
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            } else {
                // O áudio terminou
                cleanup();
                setAudioState('idle');
                setProgress(1);
                setCurrentTime(duration);
            }
        }
    }, [audioState, duration]);

    const playAudio = useCallback((buffer: AudioBuffer, offset = 0) => {
        if (!audioContextRef.current) return;
        
        cleanup(); // Limpa qualquer áudio anterior

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0, offset);

        sourceNodeRef.current = source;
        startTimeRef.current = audioContextRef.current.currentTime;
        pauseTimeRef.current = offset; // Retomamos do ponto de pausa
        
        setAudioState('playing');
        animationFrameRef.current = requestAnimationFrame(updateProgress);

        source.onended = () => {
             // Garante que o estado seja resetado se o áudio terminar por conta própria
             if (progress >= 0.99) {
                setAudioState('idle');
                setCurrentTime(duration);
                setProgress(1);
             }
        };

    }, [updateProgress, duration, progress]);

    const togglePlayPause = async () => {
        // Inicializa o AudioContext no primeiro clique
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        // Garante que o contexto de áudio seja retomado (necessário em alguns navegadores)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        if (audioState === 'playing') {
            // Pausa
            pauseTimeRef.current += audioContextRef.current.currentTime - startTimeRef.current;
            audioContextRef.current.suspend();
            cancelAnimationFrame(animationFrameRef.current);
            setAudioState('paused');
        } else if (audioState === 'paused') {
            // Retoma
            await audioContextRef.current.resume();
            startTimeRef.current = audioContextRef.current.currentTime;
            setAudioState('playing');
            animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else if (audioState === 'idle') {
            // Se já temos o áudio, apenas toca de novo
            if (audioBufferRef.current) {
                playAudio(audioBufferRef.current);
            } else {
                 // Busca e toca o áudio pela primeira vez
                try {
                    setAudioState('loading');
                    const base64Audio = await generateSpeech(textToSpeak);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
                    audioBufferRef.current = audioBuffer;
                    setDuration(audioBuffer.duration);
                    playAudio(audioBuffer);
                } catch (error) {
                    console.error("Failed to play audio", error);
                    setAudioState('error');
                }
            }
        }
    };
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioBufferRef.current || !audioContextRef.current) return;
        const newProgress = parseFloat(e.target.value);
        const newTime = duration * newProgress;

        setProgress(newProgress);
        setCurrentTime(newTime);
        
        // Se estiver tocando ou pausado, reinicia a reprodução do novo ponto
        if (audioState === 'playing' || audioState === 'paused') {
            playAudio(audioBufferRef.current, newTime);
        }
    };

    return (
        <div className="flex items-center gap-3 w-full bg-gray-100 dark:bg-slate-800/70 p-2 rounded-lg border border-gray-200 dark:border-slate-700/50">
            <button
                onClick={togglePlayPause}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-cyan-400 text-black hover:bg-cyan-300 transition-colors disabled:bg-gray-300 dark:disabled:bg-slate-600"
                disabled={audioState === 'loading'}
                aria-label={audioState === 'playing' ? 'Pausar áudio' : 'Reproduzir áudio'}
            >
                {audioState === 'loading' && <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                {audioState === 'playing' && <PauseIcon className="w-5 h-5" />}
                {(audioState === 'idle' || audioState === 'paused' || audioState === 'error') && <PlayIcon className="w-5 h-5" />}
            </button>
            <div className="flex-grow flex items-center gap-2">
                 <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{formatTime(currentTime)}</span>
                 <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full appearance-none cursor-pointer accent-cyan-500"
                    disabled={audioState === 'idle' || audioState === 'loading'}
                />
                 <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{formatTime(duration)}</span>
            </div>
            {audioState === 'error' && <p className="text-xs text-red-500">Erro</p>}
        </div>
    );
};


const QuestionCard: React.FC<{
    question: Question;
    userAnswer: string[];
    onAnswerChange: (answer: string[]) => void;
    questionNumber: number;
    totalQuestions: number;
}> = ({ question, userAnswer, onAnswerChange, questionNumber, totalQuestions }) => {

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
                 <div className="w-6 h-6 text-cyan-500 dark:text-cyan-400">
                     <SpeakerWaveIcon />
                 </div>
            </div>
            
            {question.scenario && <div className="mb-4 p-4 bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-600/50 rounded-md text-gray-700 dark:text-gray-300 italic"><p>{question.scenario}</p></div>}
            
            <p className="text-lg text-gray-800 dark:text-white mb-4">{question.text}</p>
            
             <AudioPlayer textToSpeak={question.scenario ? `${question.scenario}. ${question.text}` : question.text} />

            <div className="space-y-4 mt-6 flex-grow">
                {question.options.map(option => {
                    const isChecked = userAnswer.includes(option.id);
                    const isMulti = question.type === QuestionType.MultipleChoice;
                    const inputType = isMulti ? 'checkbox' : 'radio';

                    return (
                        <label key={option.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isChecked ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20' : 'bg-gray-50 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700/80 hover:border-gray-400 dark:hover:border-slate-500'}`}>
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
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        // Timeout permite que o navegador capture a aparência do elemento antes de o alterarmos
        setTimeout(() => setDraggingIndex(index), 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault(); // Necessário para permitir o drop
    };

    const handleDrop = (e: React.DragEvent<HTMLButtonElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndexStr = e.dataTransfer.getData('text/plain');
        if (dragIndexStr) {
            const dragIndex = parseInt(dragIndexStr, 10);
            onReorder(dragIndex, dropIndex);
        }
        // A limpeza agora ocorre no onDragEnd para lidar com drops fora de um alvo válido
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
            <div className="grid grid-cols-5 gap-2">
                {questions.map((question, i) => {
                    const isAnswered = answered.includes(question.id);
                    const isCurrent = i === current;
                    const isDragging = draggingIndex === i;
                    const isDragOver = dragOverIndex === i && draggingIndex !== i;

                    // Classes base
                    let buttonClass = "border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-grab";
                    if (isAnswered) buttonClass = "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 border-gray-300 dark:border-slate-600 cursor-grab";
                    if (isCurrent) buttonClass = "bg-cyan-400 border-cyan-400 text-black font-bold cursor-grab";
                    
                    // Feedback visual aprimorado para arrastar e soltar
                    if (isDragging) {
                        // Estilo para o item que está sendo arrastado: fica semi-transparente e "flutua"
                        buttonClass += " opacity-50 scale-105 rotate-3 cursor-grabbing";
                    } else if (isDragOver) {
                        // Estilo para o placeholder/alvo de soltura: um destaque sólido e proeminente.
                        buttonClass = "scale-110 bg-cyan-500/20 border-2 border-solid border-cyan-400 ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-slate-900";
                    }

                    return (
                        <button 
                            key={question.id} 
                            onClick={() => onJump(i)}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, i)}
                            onDragEnter={() => setDragOverIndex(i)}
                            onDragLeave={() => setDragOverIndex(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, i)}
                            onDragEnd={handleDragEnd}
                            className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 text-sm ${buttonClass}`}
                            aria-label={`Ir para a questão ${i + 1}`}
                            aria-current={isCurrent ? 'page' : undefined}
                        >
                            {i + 1}
                             {!isAnswered && !isCurrent && (
                                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500" title="Não respondida"></span>
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
    
    const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(() => {
        const savedProgressRaw = localStorage.getItem('cortexExamProgress');
        if (savedProgressRaw) {
            try {
                const savedProgress = JSON.parse(savedProgressRaw);
                // Verifica se a ordem salva corresponde ao exame atual
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
        // Não salva se o tempo acabou, pois o exame terminou.
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
        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                // Toca sons de aviso em 2 minutos, 1 minuto e 30 segundos
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
    }, [onFinishExam]);
    
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

        setAnimationClass('opacity-0'); // Inicia o fade-out

        setTimeout(() => {
            setCurrentQuestionIndex(index);
            setAnimationClass('opacity-100'); // Inicia o fade-in para a nova questão
        }, 200); // Duração da animação de fade-out
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
        
        // Atualiza o índice atual para manter a mesma questão na tela
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
                        <div className={`flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border px-3 py-1.5 rounded-lg transition-colors duration-500 ${getTimerClasses()}`}>
                            <ClockIcon className="w-5 h-5" />
                            <span className="font-mono text-lg font-semibold">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 flex flex-col gap-6">
                        <div className={`transition-opacity duration-200 ease-in-out ${animationClass}`}>
                             {currentQuestion && <QuestionCard
                                key={currentQuestion.id}
                                question={currentQuestion}
                                userAnswer={answers[currentQuestion.id] || []}
                                onAnswerChange={handleAnswerChange}
                                questionNumber={currentQuestionIndex + 1}
                                totalQuestions={orderedQuestions.length}
                            />}
                        </div>

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
                    </div>
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