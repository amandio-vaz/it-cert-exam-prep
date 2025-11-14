
import React, { useState, useEffect, useRef } from 'react';
import { ExamData, Question, UserAnswer, QuestionType } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SpeakerWaveIcon, StopIcon, ClockIcon, Squares2X2Icon } from './icons';

interface ExamViewProps {
    examData: ExamData;
    onFinishExam: (answers: UserAnswer) => void;
    initialAnswers?: UserAnswer;
    initialTimeLeft?: number | null;
}

const QuestionCard: React.FC<{
    question: Question;
    userAnswer: string[];
    onAnswerChange: (answer: string[]) => void;
    questionNumber: number;
    totalQuestions: number;
}> = ({ question, userAnswer, onAnswerChange, questionNumber, totalQuestions }) => {

    const [audio, setAudio] = useState<AudioBufferSourceNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }));
        return () => {
            audio?.stop();
            audioContext?.close();
        }
    }, []);

    const handlePlayAudio = async (text: string) => {
        if (isPlaying) {
            audio?.stop();
            setIsPlaying(false);
            return;
        }

        if (!audioContext) return;
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        try {
            setIsPlaying(true);
            const base64Audio = await generateSpeech(text);
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => setIsPlaying(false);
            source.start();
            setAudio(source);
        } catch (error) {
            console.error("Failed to play audio", error);
            setIsPlaying(false);
        }
    };


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
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                   <p className="text-sm text-cyan-400 font-semibold">{question.domain}</p>
                   <p className="text-sm text-gray-400">Questão {questionNumber} de {totalQuestions}</p>
                </div>
                 <button onClick={() => handlePlayAudio(question.scenario ? `${question.scenario}. ${question.text}` : question.text)} className="p-2 rounded-full hover:bg-slate-700 transition">
                    {isPlaying ? <StopIcon className="w-5 h-5 text-red-400" /> : <SpeakerWaveIcon className="w-5 h-5 text-cyan-400" />}
                </button>
            </div>
            
            {question.scenario && <div className="mb-4 p-4 bg-slate-800/70 border border-slate-600/50 rounded-md text-gray-300 italic"><p>{question.scenario}</p></div>}
            
            <p className="text-lg text-white mb-6 flex-grow">{question.text}</p>
            
            <div className="space-y-4">
                {question.options.map(option => {
                    const isChecked = userAnswer.includes(option.id);
                    const isMulti = question.type === QuestionType.MultipleChoice;
                    const inputType = isMulti ? 'checkbox' : 'radio';

                    return (
                        <label key={option.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isChecked ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20' : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-500'}`}>
                            <input
                                type={inputType}
                                name={question.id}
                                value={option.id}
                                checked={isChecked}
                                onChange={() => isMulti ? handleMultiChoiceChange(option.id) : handleSingleChoiceChange(option.id)}
                                className={`h-5 w-5 ${isMulti ? 'rounded' : 'rounded-full'} text-cyan-500 bg-slate-900 border-slate-600 focus:ring-cyan-500 focus:ring-offset-slate-900`}
                            />
                            <span className="ml-4 text-gray-200">{option.text}</span>
                        </label>
                    );
                })}
            </div>
             <p className="text-xs text-gray-500 mt-4 text-center">{question.type === QuestionType.MultipleChoice ? "Selecione todas as opções aplicáveis." : "Selecione uma opção."}</p>
        </div>
    );
};

const QuestionNavigator: React.FC<{
    total: number;
    current: number;
    answered: string[];
    onJump: (index: number) => void;
}> = ({ total, current, answered, onJump }) => {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sticky top-28 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Squares2X2Icon className="w-5 h-5 text-cyan-400" />
                Navegação do Exame
            </h3>
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: total }, (_, i) => {
                    const questionId = `Q${i + 1}`;
                    const isAnswered = answered.includes(questionId);
                    const isCurrent = i === current;
                    
                    let buttonClass = "border border-slate-700 text-gray-300 hover:bg-slate-700";
                    if(isAnswered) buttonClass = "bg-slate-700 text-gray-300 hover:bg-slate-600 border-slate-600";
                    if(isCurrent) buttonClass = "bg-cyan-400 border-cyan-400 text-black font-bold";

                    return (
                        <button 
                            key={i} 
                            onClick={() => onJump(i)}
                            className={`flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 text-sm ${buttonClass}`}
                            aria-label={`Ir para a questão ${i + 1}`}
                            aria-current={isCurrent ? 'page' : undefined}
                        >
                            {i + 1}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};


const ExamView: React.FC<ExamViewProps> = ({ examData, onFinishExam, initialAnswers = {}, initialTimeLeft = null }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<UserAnswer>(initialAnswers);

    const TIME_PER_QUESTION_SECONDS = 90;
    const totalTimeSeconds = examData.questions.length * TIME_PER_QUESTION_SECONDS;
    const [timeLeft, setTimeLeft] = useState(initialTimeLeft !== null ? initialTimeLeft : totalTimeSeconds);
    
    const answersRef = useRef(answers);
    answersRef.current = answers;

    useEffect(() => {
        const savedProgressRaw = localStorage.getItem('cortexExamProgress');
        if (savedProgressRaw) {
            try {
                const savedProgress = JSON.parse(savedProgressRaw);
                savedProgress.userAnswers = answers;
                savedProgress.timeLeft = timeLeft;
                localStorage.setItem('cortexExamProgress', JSON.stringify(savedProgress));
            } catch (e) {
                console.error("Erro ao salvar o progresso:", e);
            }
        }
    }, [answers, timeLeft]);


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
                if (prevTime === 121) {
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

    const getTimerColor = () => {
        if (timeLeft <= 120) return 'text-red-500 animate-pulse';
        if (timeLeft <= 300) return 'text-amber-400';
        return 'text-gray-300';
    };


    const handleAnswerChange = (answer: string[]) => {
        setAnswers(prev => ({
            ...prev,
            [examData.questions[currentQuestionIndex].id]: answer,
        }));
    };

    const handleJumpToQuestion = (index: number) => {
        if (index >= 0 && index < examData.questions.length) {
            setCurrentQuestionIndex(index);
        }
    };

    const goToNext = () => {
        if (currentQuestionIndex < examData.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const goToPrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };
    
    const progress = ((currentQuestionIndex + 1) / examData.questions.length) * 100;

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-7xl">
                 <div className="flex justify-between items-center mb-4">
                    <div className="text-left">
                        <h1 className="text-2xl font-bold">{examData.examName}</h1>
                        <h2 className="text-lg text-gray-400">{examData.examCode}</h2>
                    </div>
                     <div className={`flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 px-3 py-1.5 rounded-lg ${getTimerColor()}`}>
                        <ClockIcon className="w-5 h-5" />
                        <span className="font-mono text-lg font-semibold">{formatTime(timeLeft)}</span>
                    </div>
                 </div>
                 <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 flex flex-col gap-6">
                    <QuestionCard
                        question={examData.questions[currentQuestionIndex]}
                        userAnswer={answers[examData.questions[currentQuestionIndex].id] || []}
                        onAnswerChange={handleAnswerChange}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={examData.questions.length}
                    />

                    <div className="flex justify-between w-full">
                        <button onClick={goToPrev} disabled={currentQuestionIndex === 0} className="px-6 py-2 border border-slate-600 text-base font-medium rounded-md text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            Anterior
                        </button>
                        {currentQuestionIndex < examData.questions.length - 1 ? (
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
                        total={examData.questions.length}
                        current={currentQuestionIndex}
                        answered={Object.keys(answers).filter(key => answers[key] && answers[key].length > 0)}
                        onJump={handleJumpToQuestion}
                    />
                </div>
            </div>
        </div>
    );
};

export default ExamView;