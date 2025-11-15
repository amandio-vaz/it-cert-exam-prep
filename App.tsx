

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
import FlashcardView from './components/FlashcardView';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('config');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [examCode, setExamCode] = useState<string>('');
    const [extraTopics, setExtraTopics] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(10);
    
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswer>({});
    const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [studyPlan, setStudyPlan] = useState<string>('');
    const [questionsToReview, setQuestionsToReview] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [initialTimeLeft, setInitialTimeLeft] = useState<number | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
    const [generationStatus, setGenerationStatus] = useState<string>('');


    useEffect(() => {
        // Define o tema inicial com base no localStorage ou preferência do sistema
        const savedTheme = localStorage.getItem('cortexExamTheme') as 'light' | 'dark' | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    }, []);

    useEffect(() => {
        // Aplica a classe de tema ao elemento raiz e salva a preferência
        if (theme) {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
            localStorage.setItem('cortexExamTheme', theme);
        }
    }, [theme]);


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

    const handleStartExam = useCallback(async (language: 'pt-BR' | 'en-US') => {
        if (!examCode || uploadedFiles.length === 0) {
            setError('Por favor, forneça um código de exame e pelo menos um material de estudo.');
            return;
        }
        setError(null);
        localStorage.removeItem('cortexExamProgress');
        setAppState('generating');
        setGenerationStatus("Iniciando a geração do seu exame...");
        try {
            const onStatusUpdate = (status: string) => {
                setGenerationStatus(status);
            };

            const exam = await generateExam(uploadedFiles, examCode, questionCount, extraTopics, onStatusUpdate, language);
            
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
            let errorMessage = 'Falha ao gerar o exame. A IA pode estar sobrecarregada ou o conteúdo fornecido pode ser inválido. Tente novamente.';
            if (e instanceof Error && e.message.includes('exceeds the supported page limit')) {
                errorMessage = 'Um dos PDFs fornecidos excede o limite de 1000 páginas. Por favor, use um arquivo menor ou divida-o.';
            }
            setError(errorMessage);
            setAppState('config');
        } finally {
            setGenerationStatus('');
        }
    }, [examCode, uploadedFiles, questionCount, extraTopics, attempts]);

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
        setQuestionsToReview(examData.questions);
        setAppState('reviewing_exam');
    }, [examData]);

    const returnToConfig = () => {
        setExamData(null);
        setUserAnswers({});
        setCurrentAttempt(null);
        setStudyPlan('');
        setQuestionsToReview([]);
        setError(null);
        setAppState('config');
        localStorage.removeItem('cortexExamProgress');
    };
    
    const handleViewFlashcards = () => setAppState('viewing_flashcards');

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const renderContent = () => {
        switch (appState) {
            case 'config':
                return <ConfigView 
                            uploadedFiles={uploadedFiles}
                            setUploadedFiles={setUploadedFiles}
                            examCode={examCode}
                            setExamCode={setExamCode}
                            extraTopics={extraTopics}
                            setExtraTopics={setExtraTopics}
                            questionCount={questionCount}
                            setQuestionCount={setQuestionCount}
                            attempts={attempts}
                            onStartExam={handleStartExam}
                            onViewFlashcards={handleViewFlashcards}
                            error={error}
                        />;
            case 'generating':
                return <LoadingIndicator message={generationStatus || "Gerando seu plano de estudo... A IA está analisando seus materiais e criando questões."} />;
            case 'taking_exam':
                return examData && <ExamView 
                                        examData={examData} 
                                        onFinishExam={handleFinishExam} 
                                        initialAnswers={userAnswers}
                                        initialTimeLeft={initialTimeLeft}
                                        attempts={attempts}
                                    />;
            case 'results':
                return examData && currentAttempt && <ResultsView 
                                                        examData={examData} 
                                                        userAnswers={userAnswers} 
                                                        attempt={currentAttempt}
                                                        history={attempts}
                                                        onTryAgain={returnToConfig}
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
            case 'viewing_flashcards':
                return <FlashcardView onBack={returnToConfig} />;
            default:
                return <div>Estado desconhecido</div>;
        }
    };
    
    if (!theme) {
      return null; // ou um spinner de carregamento inicial
    }

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {appState !== 'config' && <Header theme={theme} onToggleTheme={toggleTheme} />}
            <main className="flex-grow container mx-auto p-4 md:p-8 fade-in">
                {renderContent()}
            </main>
            <footer className="text-center py-6 text-gray-500 dark:text-gray-500 text-sm fade-in" style={{ animationDelay: '200ms' }}>
                <p>Desenvolvido com ❤️ por Amândio Vaz - 2025</p>
            </footer>
        </div>
    );
};

export default App;