
import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'; // Import React Router hooks and components
import { ExamData, Attempt, Question, UserAnswer, UploadedFile } from './types';
import { generateExam, generateStudyPlan, analyzeImageWithGemini } from './services/geminiService';

// Fix: Header is now consistently a named export from Header.tsx
import { Header } from './components/Header';
import ConfigView from './components/ConfigView';
import ExamView from './components/ExamView';
import ResultsView from './components/ResultsView';
import StudyPlanView from './components/StudyPlanView';
import ImageAnalyzerView from './components/ImageAnalyzerView';
import LoadingIndicator from './components/LoadingIndicator';
import ReviewView from './components/ReviewView';
import FlashcardView from './components/FlashcardView';
import AttemptHistoryView from './components/AttemptHistoryView';
import AttemptDetailsView from './components/AttemptDetailsView';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';


const App: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isMountedRef = React.useRef(true);

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
    // NOVOS ESTADOS PARA RESTAURAÇÃO DE PROGRESSO
    const [initialCurrentQuestionIndex, setInitialCurrentQuestionIndex] = useState<number | null>(null);
    const [initialOrderedQuestions, setInitialOrderedQuestions] = useState<Question[] | null>(null);
    const [initialFlaggedQuestions, setInitialFlaggedQuestions] = useState<string[] | null>(null);

    // Simplificação de login (ainda usando LoginView para a primeira tela, mas sem autenticação real complexa)
    // Para simplificar conforme pedido anterior, assumimos que se o usuário está na raiz e não tem dados, mostra login.
    // Mas o usuário pediu para remover a caixa de login anteriormente e depois deu o código dela de volta.
    // Vou manter a estrutura visual.
    const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('cortexUserEmail'));

    const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
    const [generationStatus, setGenerationStatus] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Novo estado para o sidebar


    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Load attempts from local storage (anonymous/global)
    useEffect(() => {
        const savedAttempts = localStorage.getItem('cortexAttempts');
        if (savedAttempts) {
            try {
                setAttempts(JSON.parse(savedAttempts));
            } catch (e) {
                console.error("Failed to parse stored attempts:", e);
            }
        }
    }, []);

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
                const { 
                    appState: savedAppState, 
                    examData: savedExamData, 
                    userAnswers: savedUserAnswers, 
                    timeLeft: savedTimeLeft, 
                    attempts: savedAttempts, 
                    orderedQuestionIds: savedOrderedQuestionIds, 
                    flaggedQuestions: savedFlaggedQuestions, 
                    currentQuestionIndex: savedCurrentQuestionIndex 
                } = JSON.parse(savedProgress);

                if (savedAppState === 'taking_exam' && savedExamData && savedUserAnswers && savedTimeLeft > 0) {
                    if (window.confirm('Encontramos um exame em andamento. Deseja continuar de onde parou?')) {
                        
                        let restoredOrderedQuestions = savedExamData.questions;
                        if (savedOrderedQuestionIds && savedOrderedQuestionIds.length === savedExamData.questions.length) {
                            const questionMap = new Map(savedExamData.questions.map((q: Question) => [q.id, q]));
                            const reorderedQuestions = savedOrderedQuestionIds.map((id: string) => questionMap.get(id)).filter((q: Question | undefined): q is Question => !!q);
                            if (reorderedQuestions.length === savedExamData.questions.length) { // Ensure all questions were found and reordered
                                restoredOrderedQuestions = reorderedQuestions;
                            }
                        }

                        setExamData(savedExamData); // Use the original examData, `ExamView` will handle reordering if `initialOrderedQuestions` is passed
                        setUserAnswers(savedUserAnswers);
                        
                        setInitialTimeLeft(savedTimeLeft);
                        setInitialCurrentQuestionIndex(savedCurrentQuestionIndex !== undefined ? savedCurrentQuestionIndex : 0);
                        setInitialOrderedQuestions(restoredOrderedQuestions);
                        setInitialFlaggedQuestions(savedFlaggedQuestions || []);

                        navigate('/exam'); 
                    } else {
                        localStorage.removeItem('cortexExamProgress');
                        // Clear initial states if user chooses not to resume
                        setInitialCurrentQuestionIndex(null);
                        setInitialOrderedQuestions(null);
                        setInitialFlaggedQuestions(null);
                    }
                }
            } catch (error) {
                console.error("Falha ao carregar o progresso salvo:", error);
                localStorage.removeItem('cortexExamProgress');
                setInitialCurrentQuestionIndex(null); // Clear on error
                setInitialOrderedQuestions(null);
                setInitialFlaggedQuestions(null);
            }
        }
    }, [navigate]); 

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    const handleThemeToggle = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, []);

    const handleLogin = (email: string) => {
        localStorage.setItem('cortexUserEmail', email);
        setUserEmail(email);
        return true;
    };

    const handleStartExam = useCallback(async (language: 'pt-BR' | 'en-US') => {
        if (!examCode || uploadedFiles.length === 0) {
            setError('Por favor, forneça um código de exame e pelo menos um material de estudo.');
            return;
        }
        setError(null);
        localStorage.removeItem('cortexExamProgress'); // Always clear previous progress on new exam start
        setInitialCurrentQuestionIndex(null); // Clear initial states
        setInitialOrderedQuestions(null);
        setInitialFlaggedQuestions(null);


        setGenerationStatus("Iniciando a geração do seu exame...");
        try {
            const onStatusUpdate = (status: string) => {
                setGenerationStatus(status);
            };

            const exam = await generateExam(uploadedFiles, examCode, questionCount, extraTopics, onStatusUpdate, language);
            
            // Initial progress for a new exam
            const initialProgress = {
                appState: 'taking_exam',
                examData: exam,
                userAnswers: {},
                timeLeft: exam.questions.length * 90, // 90 seconds per question
                currentQuestionIndex: 0, // Start at the first question
                orderedQuestionIds: exam.questions.map(q => q.id), // Default order
                flaggedQuestions: [], // No questions flagged initially
                attempts: attempts
            };
            localStorage.setItem('cortexExamProgress', JSON.stringify(initialProgress));
            
            setExamData(exam);
            setUserAnswers({});
            setInitialTimeLeft(null); // Let ExamView calculate its initial time based on new exam
            setInitialCurrentQuestionIndex(0); // For a fresh start
            setInitialOrderedQuestions(exam.questions); // For a fresh start
            setInitialFlaggedQuestions([]); // For a fresh start

            closeSidebar(); // Fecha o sidebar após iniciar o exame
            navigate('/exam'); // Navigate to exam view
        } catch (e) {
            console.error(e);
            let errorMessage = 'Falha ao gerar o exame. A IA pode estar sobrecarregada ou o conteúdo fornecido pode ser inválido. Tente novamente.';
            if (e instanceof Error) {
                if (e.message.includes('exceeds the supported page limit')) {
                    errorMessage = 'Um dos PDFs fornecidos excede o limite de 1000 páginas. Por favor, use um arquivo menor ou divida-o.';
                } else if (e.message.includes('password protected')) {
                    errorMessage = 'Um dos PDFs fornecidos está protegido por senha e não pode ser processado.';
                } else if (e.message.includes('Failed to process file')) {
                    errorMessage = `Falha ao processar um dos arquivos: ${e.message}. Verifique se o arquivo não está corrompido.`;
                } else if (e.message.includes('JSON') || e.message.includes('formato JSON')) {
                    errorMessage = 'Erro ao processar a resposta da IA. O conteúdo gerado não estava no formato esperado. Tente novamente com menos questões ou documentos menores.';
                }
            }
            setError(errorMessage);
            closeSidebar(); // Fecha o sidebar em caso de erro
            navigate('/'); // Navigate back to config view on error
        } finally {
            setGenerationStatus('');
        }
    }, [examCode, uploadedFiles, questionCount, extraTopics, attempts, navigate, closeSidebar]);

    const handleFinishExam = useCallback((finalAnswers: UserAnswer) => {
        if (!examData) return;

        let correctCount = 0;
        examData.questions.forEach(q => {
            const correct = q.correctAnswers;
            const userAnswer = finalAnswers[q.id] || [];
            if (correct.length === userAnswer.length && correct.every(val => userAnswer.includes(val))) {
                correctCount++;
            }
        });

        const newAttempt: Attempt = {
            score: (correctCount / examData.questions.length) * 100,
            totalQuestions: examData.questions.length,
            correctAnswers: correctCount,
            timestamp: Date.now(),
            examCode: examData.examCode,
            examData: examData, // Store full exam data
            userAnswers: finalAnswers, // Store user's answers for this attempt
        };
        
        const updatedAttempts = [...attempts, newAttempt];
        setAttempts(updatedAttempts);

        // Salva as tentativas atualizadas no armazenamento global
        try {
            localStorage.setItem('cortexAttempts', JSON.stringify(updatedAttempts));
        } catch (e) {
            console.error("Falha ao salvar tentativas:", e);
        }

        setUserAnswers(finalAnswers);
        setCurrentAttempt(newAttempt);
        closeSidebar(); // Fecha o sidebar
        navigate('/results'); // Navigate to results view
        localStorage.removeItem('cortexExamProgress'); // Clear progress after finishing
        setInitialCurrentQuestionIndex(null); // Clear initial states after finishing
        setInitialOrderedQuestions(null);
        setInitialFlaggedQuestions(null);

    }, [examData, attempts, navigate, closeSidebar]);
    
    const handleGenerateStudyPlan = useCallback(async () => {
        if (!examData || !currentAttempt) return;

        setGenerationStatus("Criando seu plano de estudos personalizado...");
        try {
            const plan = await generateStudyPlan(examData, userAnswers, currentAttempt);
            if (isMountedRef.current) {
                setStudyPlan(plan);
                closeSidebar(); // Fecha o sidebar
                navigate('/study-plan'); // Navigate to study plan view
            }
        } catch (e) {
            console.error(e);
            if (isMountedRef.current) {
                setError('Falha ao gerar o plano de estudos.');
                closeSidebar(); // Fecha o sidebar em caso de erro
                navigate('/results'); // Volta para a tela de resultados em caso de erro
            }
        } finally {
            if (isMountedRef.current) {
                setGenerationStatus('');
            }
        }
    }, [examData, userAnswers, currentAttempt, navigate, closeSidebar]);

    const handleStartReview = useCallback(() => {
        if (!currentAttempt) return;
        const incorrectQuestions = currentAttempt.examData.questions.filter(q => {
            const userAnswer = currentAttempt.userAnswers[q.id] || [];
            return !(q.correctAnswers.length === userAnswer.length && q.correctAnswers.every(val => userAnswer.includes(val)));
        });
        setQuestionsToReview(incorrectQuestions);
        closeSidebar(); // Fecha o sidebar
        navigate('/review');
    }, [currentAttempt, navigate, closeSidebar]);

    const handleAnalyzeImage = useCallback(async (file: UploadedFile, prompt: string): Promise<string> => {
        setGenerationStatus("Analisando imagem com Gemini...");
        try {
            const result = await analyzeImageWithGemini(file, prompt);
            return result;
        } catch (e) {
            console.error(e);
            setError('Falha ao analisar a imagem.');
            return 'Erro na análise da imagem.';
        } finally {
            if (isMountedRef.current) {
                setGenerationStatus('');
            }
        }
    }, []);

    const handleRegenerateStudyPlan = useCallback(async () => {
        if (!examData || !currentAttempt) return;
        setGenerationStatus("Regerando plano de estudos...");
        try {
            const plan = await generateStudyPlan(examData, userAnswers, currentAttempt);
            if (isMountedRef.current) {
                setStudyPlan(plan);
                navigate('/study-plan'); // Permanece na tela de plano de estudos
            }
        } catch (e) {
            console.error(e);
            if (isMountedRef.current) {
                setError('Falha ao regerar o plano de estudos.');
            }
        } finally {
            if (isMountedRef.current) {
                setGenerationStatus('');
            }
        }
    }, [examData, userAnswers, currentAttempt, navigate]);

    const handleNavigate = useCallback((path: string) => {
        if (location.pathname !== path) {
            navigate(path);
        }
        if (window.innerWidth < 768) { 
            closeSidebar(); 
        }
    }, [navigate, location.pathname, closeSidebar]);

    const mainContentClasses = `
        flex-grow p-6 md:p-8 transition-[margin-left] duration-300 ease-in-out
        ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}
        overflow-auto h-screen custom-scrollbar
    `;

    // Render logic: Show LoginView if no email is set
    if (!userEmail) {
        return (
            <div className="flex min-h-screen bg-slate-950 text-white">
               <LoginView onLogin={handleLogin} />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                onNavigate={handleNavigate}
                onToggle={toggleSidebar}
            />
            
            <div className="flex-1 flex flex-col">
                <Header
                    theme={theme}
                    onThemeToggle={handleThemeToggle}
                    onToggleSidebar={toggleSidebar}
                    isSidebarOpen={isSidebarOpen}
                />
                {generationStatus && <LoadingIndicator message={generationStatus} />}
                
                <main className={mainContentClasses}>
                    {!generationStatus && ( // Render routes only when not generating
                        <Routes>
                            <Route path="/" element={
                                <ConfigView
                                    uploadedFiles={uploadedFiles}
                                    setUploadedFiles={setUploadedFiles}
                                    examCode={examCode}
                                    setExamCode={setExamCode}
                                    extraTopics={extraTopics}
                                    setExtraTopics={setExtraTopics}
                                    questionCount={questionCount}
                                    setQuestionCount={setQuestionCount}
                                    onStartExam={handleStartExam}
                                    onViewFlashcards={() => handleNavigate('/flashcards')}
                                    onViewAttemptHistory={() => handleNavigate('/history')}
                                    onViewImageAnalyzer={() => handleNavigate('/image-analyzer')}
                                    attempts={attempts}
                                    error={error}
                                />
                            } />
                            <Route path="/exam" element={
                                examData ? (
                                    <ExamView
                                        examData={examData}
                                        onFinishExam={handleFinishExam}
                                        initialAnswers={userAnswers}
                                        initialTimeLeft={initialTimeLeft}
                                        attempts={attempts}
                                        initialQuestionIndex={initialCurrentQuestionIndex} 
                                        initialOrderedQuestions={initialOrderedQuestions} 
                                        initialFlaggedQuestions={initialFlaggedQuestions} 
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhum exame carregado. Volte para a configuração.</div>
                                )
                            } />
                            <Route path="/results" element={
                                currentAttempt && examData ? (
                                    <ResultsView
                                        examData={examData}
                                        userAnswers={userAnswers}
                                        attempt={currentAttempt}
                                        history={attempts}
                                        onTryAgain={() => handleNavigate('/')} 
                                        onGenerateStudyPlan={handleGenerateStudyPlan}
                                        onStartReview={handleStartReview}
                                        onViewAttemptHistory={() => handleNavigate('/history')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhum resultado de exame disponível.</div>
                                )
                            } />
                            <Route path="/study-plan" element={
                                studyPlan ? (
                                    <StudyPlanView
                                        plan={studyPlan}
                                        examCode={examData?.examCode || 'N/A'}
                                        onBackToResults={() => handleNavigate('/results')}
                                        onRegenerate={handleRegenerateStudyPlan}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhum plano de estudos disponível.</div>
                                )
                            } />
                            <Route path="/image-analyzer" element={
                                <ImageAnalyzerView
                                    onAnalyze={handleAnalyzeImage}
                                    onBack={() => handleNavigate('/')}
                                />
                            } />
                            <Route path="/review" element={
                                questionsToReview.length > 0 && currentAttempt ? (
                                    <ReviewView
                                        questions={questionsToReview}
                                        userAnswers={currentAttempt.userAnswers}
                                        onBackToResults={() => handleNavigate('/results')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhuma questão para revisar ou tentativa atual não definida.</div>
                                )
                            } />
                            <Route path="/flashcards" element={
                                <FlashcardView
                                    onBack={() => handleNavigate('/')}
                                />
                            } />
                            <Route path="/history" element={
                                <AttemptHistoryView
                                    attempts={attempts}
                                    onBack={() => handleNavigate('/')}
                                    onViewDetails={(attempt) => {
                                        setCurrentAttempt(attempt); 
                                        navigate(`/history/${attempt.timestamp}`); 
                                    }}
                                />
                            } />
                             <Route path="/history/:timestamp" element={
                                currentAttempt ? (
                                    <AttemptDetailsView
                                        attempt={currentAttempt}
                                        onBack={() => handleNavigate('/history')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Detalhes da tentativa não encontrados.</div>
                                )
                            } />
                        </Routes>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
