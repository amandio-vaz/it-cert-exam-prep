
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, ExamData, Attempt, Question, UserAnswer, UploadedFile } from './types';
import { generateExam, generateStudyPlan, analyzeImageWithGemini } from './services/geminiService';

import Header from './components/Header';
import ConfigView from './components/ConfigView';
import ExamView from './components/ExamView';
import ResultsView from './components/ResultsView';
import StudyPlanView from './components/StudyPlanView';
import ImageAnalyzerView from './components/ImageAnalyzerView';
import LoadingIndicator from './components/LoadingIndicator';
import ReviewView from './components/ReviewView';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('config');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [urls, setUrls] = useState<string>('');
    const [examCode, setExamCode] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [useThinkingMode, setUseThinkingMode] = useState<boolean>(false);
    
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswer>({});
    const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [studyPlan, setStudyPlan] = useState<string>('');
    const [questionsToReview, setQuestionsToReview] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [initialTimeLeft, setInitialTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        const savedProgress = localStorage.getItem('cortexExamProgress');
        if (savedProgress) {
            try {
                const { appState: savedAppState, examData: savedExamData, userAnswers: savedUserAnswers, timeLeft: savedTimeLeft, attempts: savedAttempts } = JSON.parse(savedProgress);

                if (savedAppState === 'taking_exam' && savedExamData && savedUserAnswers && savedTimeLeft > 0) {
                    if (window.confirm('Encontramos um exame em andamento. Deseja continuar de onde parou?')) {
                        setExamData(savedExamData);
                        setUserAnswers(savedUserAnswers);
                        setAttempts(savedAttempts || []);
                        setInitialTimeLeft(savedTimeLeft);
                        setAppState('taking_exam');
                    } else {
                        localStorage.removeItem('cortexExamProgress');
                    }
                }
            } catch (error) {
                console.error("Falha ao carregar o progresso salvo:", error);
                localStorage.removeItem('cortexExamProgress');
            }
        }
    }, []);

    const handleStartExam = useCallback(async () => {
        if (!examCode || (uploadedFiles.length === 0 && !urls)) {
            setError('Por favor, forneça um código de exame e pelo menos um material de estudo (arquivo ou URL).');
            return;
        }
        setError(null);
        localStorage.removeItem('cortexExamProgress');
        setAppState('generating');
        try {
            const exam = await generateExam(uploadedFiles, urls.split('\n').filter(u => u.trim() !== ''), examCode, questionCount, useThinkingMode);
            
            const initialProgress = {
                appState: 'taking_exam',
                examData: exam,
                userAnswers: {},
                timeLeft: exam.questions.length * 90, // 90 seconds per question
                attempts: attempts
            };
            localStorage.setItem('cortexExamProgress', JSON.stringify(initialProgress));
            
            setExamData(exam);
            setUserAnswers({});
            setInitialTimeLeft(null);
            setAppState('taking_exam');
        } catch (e) {
            console.error(e);
            setError('Falha ao gerar o exame. Verifique o console para mais detalhes.');
            setAppState('config');
        }
    }, [examCode, uploadedFiles, urls, questionCount, useThinkingMode, attempts]);

    const handleFinishExam = useCallback((finalAnswers: UserAnswer) => {
        if (!examData) return;
        
        let correctCount = 0;
        examData.questions.forEach(q => {
            const correct = q.correctAnswers;
            const user = finalAnswers[q.id] || [];
            if (correct.length === user.length && correct.every(val => user.includes(val))) {
                correctCount++;
            }
        });

        const newAttempt: Attempt = {
            score: (correctCount / examData.questions.length) * 100,
            totalQuestions: examData.questions.length,
            correctAnswers: correctCount,
            timestamp: Date.now(),
        };
        
        setUserAnswers(finalAnswers);
        setCurrentAttempt(newAttempt);
        setAttempts(prev => [...prev, newAttempt]);
        setAppState('results');
        localStorage.removeItem('cortexExamProgress');

    }, [examData]);
    
    const handleGenerateStudyPlan = useCallback(async () => {
        if (!examData || !currentAttempt) return;

        setAppState('generating_study_plan');
        try {
            const plan = await generateStudyPlan(examData, userAnswers, currentAttempt);
            setStudyPlan(plan);
            setAppState('study_plan');
        } catch (e) {
            console.error(e);
            setError('Falha ao gerar o plano de estudos.');
            setAppState('results');
        }
    }, [examData, userAnswers, currentAttempt]);

    const handleAnalyzeImage = useCallback(async (file: UploadedFile, prompt: string) => {
        try {
            const analysis = await analyzeImageWithGemini(file, prompt);
            return analysis;
        } catch(e) {
            console.error(e);
            throw new Error("Falha ao analisar a imagem.");
        }
    }, []);

    const handleStartReview = useCallback(() => {
        if (!examData) return;
        const incorrect = examData.questions.filter(q => {
            const correct = q.correctAnswers;
            const user = userAnswers[q.id] || [];
            return !(correct.length === user.length && correct.every(val => user.includes(val)));
        });
        setQuestionsToReview(incorrect);
        setAppState('reviewing_exam');
    }, [examData, userAnswers]);

    const resetToConfig = () => {
        setExamData(null);
        setUserAnswers({});
        setCurrentAttempt(null);
        setStudyPlan('');
        setQuestionsToReview([]);
        setError(null);
        setAppState('config');
        localStorage.removeItem('cortexExamProgress');
    };

    const renderContent = () => {
        switch (appState) {
            case 'config':
                return <ConfigView 
                            uploadedFiles={uploadedFiles}
                            setUploadedFiles={setUploadedFiles}
                            urls={urls}
                            setUrls={setUrls}
                            examCode={examCode}
                            setExamCode={setExamCode}
                            questionCount={questionCount}
                            setQuestionCount={setQuestionCount}
                            useThinkingMode={useThinkingMode}
                            setUseThinkingMode={setUseThinkingMode}
                            onStartExam={handleStartExam}
                            onAnalyzeImageClick={() => setAppState('analyzing_image')}
                            error={error}
                        />;
            case 'generating':
                return <LoadingIndicator message="Gerando seu exame simulado... A IA está analisando seus materiais e criando questões." />;
            case 'taking_exam':
                return examData && <ExamView 
                                        examData={examData} 
                                        onFinishExam={handleFinishExam} 
                                        initialAnswers={userAnswers}
                                        initialTimeLeft={initialTimeLeft}
                                    />;
            case 'results':
                return examData && currentAttempt && <ResultsView 
                                                        examData={examData} 
                                                        userAnswers={userAnswers} 
                                                        attempt={currentAttempt}
                                                        history={attempts}
                                                        onTryAgain={resetToConfig}
                                                        onGenerateStudyPlan={handleGenerateStudyPlan}
                                                        onStartReview={handleStartReview}
                                                     />;
            case 'generating_study_plan':
                return <LoadingIndicator message="Criando seu plano de estudos personalizado..." />;
            case 'study_plan':
                return examData && <StudyPlanView 
                                        plan={studyPlan} 
                                        examCode={examData.examCode}
                                        onBackToResults={() => setAppState('results')} 
                                        onRegenerate={handleGenerateStudyPlan}
                                    />;
            case 'analyzing_image':
                return <ImageAnalyzerView onAnalyze={handleAnalyzeImage} onBack={() => setAppState('config')} />;
            case 'reviewing_exam':
                return <ReviewView 
                            questions={questionsToReview} 
                            userAnswers={userAnswers} 
                            onBackToResults={() => setAppState('results')} 
                        />;
            default:
                return <div>Estado desconhecido</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
