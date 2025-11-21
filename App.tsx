import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'; // Import React Router hooks and components
import { ExamData, Attempt, Question, UserAnswer, UploadedFile, User } from './types';
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
import LoginView from './components/LoginView';
import AttemptHistoryView from './components/AttemptHistoryView';
import AttemptDetailsView from './components/AttemptDetailsView';
import Sidebar from './components/Sidebar';
import RegisterView from './components/RegisterView'; // Import RegisterView


const App: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isMountedRef = React.useRef(true);


    const [user, setUser] = useState<User | null>(null);
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Novo estado para o sidebar


    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Initialize user from local storage (mock session)
    useEffect(() => {
        const storedUser = localStorage.getItem('cortexCurrentUser');
        if (storedUser) {
            try {
                const parsedUser: User = JSON.parse(storedUser);
                setUser(parsedUser);
                // Load attempts for this user
                const savedUserDataRaw = localStorage.getItem(`cortexUserData_${parsedUser.id}`);
                if (savedUserDataRaw) {
                    const savedUserData = JSON.parse(savedUserDataRaw);
                    setAttempts(savedUserData.attempts || []);
                } else {
                    setAttempts([]);
                }
            } catch (e) {
                console.error("Failed to parse stored user:", e);
                localStorage.removeItem('cortexCurrentUser');
            }
        } else {
            // If no user is logged in, and not already on login/register page,
            // the conditional rendering below will handle showing the login page.
            // Explicit navigation here is removed to prevent security errors in restricted environments.
            // if (location.pathname !== '/login' && location.pathname !== '/register') {
            //     navigate('/login');
            // }
        }
    }, []); // Run only once on mount to restore session

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
        if (user && savedProgress) { // Only attempt to restore if a user is logged in
            try {
                const { appState: savedAppState, examData: savedExamData, userAnswers: savedUserAnswers, timeLeft: savedTimeLeft, attempts: savedAttempts, orderedQuestionIds: savedOrderedQuestionIds, flaggedQuestions: savedFlaggedQuestions } = JSON.parse(savedProgress);

                if (savedAppState === 'taking_exam' && savedExamData && savedUserAnswers && savedTimeLeft > 0) {
                    if (window.confirm('Encontramos um exame em andamento. Deseja continuar de onde parou?')) {
                        // `user` is already set by the initial useEffect, so no need to mock login again
                        setExamData(savedExamData);
                        setUserAnswers(savedUserAnswers);
                        setAttempts(savedAttempts || []);
                        setInitialTimeLeft(savedTimeLeft);
                        navigate('/exam'); 
                    } else {
                        localStorage.removeItem('cortexExamProgress');
                    }
                }
            } catch (error) {
                console.error("Falha ao carregar o progresso salvo:", error);
                localStorage.removeItem('cortexExamProgress');
            }
        }
    }, [user, navigate]); // Depend on `user` to ensure it's loaded before checking progress

    // ===== Mock Authentication Handlers =====
    const handleLogin = useCallback((email: string, password: string) => {
        const registeredUsersRaw = localStorage.getItem('cortexRegisteredUsers');
        const registeredUsers = registeredUsersRaw ? JSON.parse(registeredUsersRaw) : {};

        const foundUser = Object.values(registeredUsers).find((u: any) => u.email === email && u.password === password);

        if (foundUser) {
            const mockUser: User = { id: (foundUser as any).id, email: email };
            setUser(mockUser);
            localStorage.setItem('cortexCurrentUser', JSON.stringify(mockUser));

            const savedUserDataRaw = localStorage.getItem(`cortexUserData_${mockUser.id}`);
            if (savedUserDataRaw) {
                try {
                    const savedUserData = JSON.parse(savedUserDataRaw);
                    setAttempts(savedUserData.attempts || []);
                } catch (e) {
                    console.error("Falha ao carregar dados do usuário:", e);
                    setAttempts([]);
                }
            } else {
                setAttempts([]);
            }
            navigate('/');
            return true;
        } else {
            setError('Email ou senha inválidos.');
            return false;
        }
    }, [navigate]);

    const handleRegister = useCallback((email: string, password: string) => {
        const registeredUsersRaw = localStorage.getItem('cortexRegisteredUsers');
        const registeredUsers = registeredUsersRaw ? JSON.parse(registeredUsersRaw) : {};

        if (Object.values(registeredUsers).some((u: any) => u.email === email)) {
            setError('Este email já está registrado.');
            return false;
        }

        const newUserId = `user_${Date.now()}`;
        const newUser = { id: newUserId, email: email, password: password };
        registeredUsers[newUserId] = newUser;
        localStorage.setItem('cortexRegisteredUsers', JSON.stringify(registeredUsers));

        const mockUser: User = { id: newUserId, email: email };
        setUser(mockUser);
        localStorage.setItem('cortexCurrentUser', JSON.stringify(mockUser));
        setAttempts([]); // New user, no previous attempts
        navigate('/');
        return true;
    }, [navigate]);


    const handleLogout = useCallback(() => {
        setUser(null);
        setAttempts([]); // Limpa as tentativas ao deslogar
        setIsSidebarOpen(false); // Fecha o sidebar ao deslogar
        localStorage.removeItem('cortexExamProgress'); // Limpa qualquer progresso de exame em andamento
        localStorage.removeItem('cortexCurrentUser'); // Clear current user session
        navigate('/login'); // Redireciona para a página de login
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

    const handleStartExam = useCallback(async (language: 'pt-BR' | 'en-US') => {
        if (!examCode || uploadedFiles.length === 0) {
            setError('Por favor, forneça um código de exame e pelo menos um material de estudo.');
            return;
        }
        setError(null);
        localStorage.removeItem('cortexExamProgress');
        setGenerationStatus("Iniciando a geração do seu exame...");
        try {
            const onStatusUpdate = (status: string) => {
                setGenerationStatus(status);
            };

            const exam = await generateExam(uploadedFiles, examCode, questionCount, extraTopics, onStatusUpdate, language);
            
            const initialProgress = {
                appState: 'taking_exam', // Still needed for local storage to identify the state
                examData: exam,
                userAnswers: {},
                timeLeft: exam.questions.length * 90, // 90 seconds per question
                attempts: attempts
            };
            localStorage.setItem('cortexExamProgress', JSON.stringify(initialProgress));
            
            setExamData(exam);
            setUserAnswers({});
            setInitialTimeLeft(null);
            closeSidebar(); // Fecha o sidebar após iniciar o exame
            navigate('/exam'); // Navigate to exam view
        } catch (e) {
            console.error(e);
            let errorMessage = 'Falha ao gerar o exame. A IA pode estar sobrecarregada ou o conteúdo fornecido pode ser inválido. Tente novamente.';
            if (e instanceof Error && e.message.includes('exceeds the supported page limit')) {
                errorMessage = 'Um dos PDFs fornecidos excede o limite de 1000 páginas. Por favor, use um arquivo menor ou divida-o.';
            } else if (e instanceof Error && e.message.includes('password protected')) {
                errorMessage = 'Um dos PDFs fornecidos está protegido por senha e não pode ser processado.';
            } else if (e instanceof Error && e.message.includes('Failed to process file')) {
                errorMessage = `Falha ao processar um dos arquivos: ${e.message}. Verifique se o arquivo não está corrompido.`;
            }
            setError(errorMessage);
            closeSidebar(); // Fecha o sidebar em caso de erro
            navigate('/'); // Navigate back to config view on error
        } finally {
            setGenerationStatus('');
        }
    }, [examCode, uploadedFiles, questionCount, extraTopics, attempts, navigate, closeSidebar]);

    const handleFinishExam = useCallback((finalAnswers: UserAnswer) => {
        if (!examData || !user) return; // user should always be present now due to mock

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

        // Salva as tentativas atualizadas para o usuário
        try {
            const userDataToSave = {
                attempts: updatedAttempts,
            };
            // user is guaranteed to be not null here.
            localStorage.setItem(`cortexUserData_${user.id}`, JSON.stringify(userDataToSave));
        } catch (e) {
            console.error("Falha ao salvar os dados do usuário:", e);
        }

        setUserAnswers(finalAnswers);
        setCurrentAttempt(newAttempt);
        closeSidebar(); // Fecha o sidebar
        navigate('/results'); // Navigate to results view
        localStorage.removeItem('cortexExamProgress');

    }, [examData, user, attempts, navigate, closeSidebar]);
    
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

    // Handlers para navegação via sidebar
    const handleNavigate = useCallback((path: string) => {
        // Only navigate if path is different to avoid unnecessary re-renders/pushes
        if (location.pathname !== path) {
            navigate(path);
        }
        // Close sidebar in mobile, in desktop it stays as is
        if (window.innerWidth < 768) { 
            closeSidebar(); 
        }
    }, [navigate, location.pathname, closeSidebar]);


    // Re-enabled: Authentication gate
    if (!user && location.pathname !== '/login' && location.pathname !== '/register') {
        return <LoginView onLogin={handleLogin} />;
    }

    // Removed local sidebar width constants as they are now handled by CSS variables or direct Tailwind classes from Sidebar.tsx
    // Corrected dynamic Tailwind class for margin-left
    const mainContentClasses = `
        flex-grow p-6 md:p-8 transition-[margin-left] duration-300 ease-in-out
        ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}
        overflow-auto h-screen custom-scrollbar
    `;

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-gray-900 dark:to-black">
            {/* Sidebar always renders, but its content might depend on `user` */}
            {user && ( // Only render sidebar if user is logged in
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                    onNavigate={handleNavigate}
                    onToggle={toggleSidebar}
                />
            )}
            
            <div className="flex-1 flex flex-col">
                {/* Header always renders, but its content might depend on `user` */}
                {user && ( // Only render header if user is logged in
                    <Header
                        user={user}
                        onLogout={handleLogout}
                        theme={theme}
                        onThemeToggle={handleThemeToggle}
                        onToggleSidebar={toggleSidebar}
                        isSidebarOpen={isSidebarOpen}
                    />
                )}
                {generationStatus && <LoadingIndicator message={generationStatus} />}
                
                <main className={mainContentClasses}>
                    {!generationStatus && ( // Render routes only when not generating
                        <Routes>
                            <Route path="/login" element={<LoginView onLogin={handleLogin} />} />
                            <Route path="/register" element={<RegisterView onRegister={handleRegister} />} />
                            <Route path="/" element={
                                user ? ( // Protect routes that require authentication
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
                                ) : (
                                    <LoginView onLogin={handleLogin} /> // Redirect to login if not authenticated
                                )
                            } />
                            <Route path="/exam" element={
                                user && examData ? (
                                    <ExamView
                                        examData={examData}
                                        onFinishExam={handleFinishExam}
                                        initialAnswers={userAnswers}
                                        initialTimeLeft={initialTimeLeft}
                                        attempts={attempts}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhum exame carregado ou usuário não autenticado. Volte para a configuração.</div>
                                )
                            } />
                            <Route path="/results" element={
                                user && currentAttempt && examData ? (
                                    <ResultsView
                                        examData={examData}
                                        userAnswers={userAnswers}
                                        attempt={currentAttempt}
                                        history={attempts}
                                        onTryAgain={() => handleNavigate('/')} // Volta para a tela de configuração
                                        onGenerateStudyPlan={handleGenerateStudyPlan}
                                        onStartReview={handleStartReview}
                                        onViewAttemptHistory={() => handleNavigate('/history')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhum resultado de exame disponível ou usuário não autenticado.</div>
                                )
                            } />
                            <Route path="/study-plan" element={
                                user && studyPlan ? (
                                    <StudyPlanView
                                        plan={studyPlan}
                                        examCode={examData?.examCode || 'N/A'}
                                        onBackToResults={() => handleNavigate('/results')}
                                        onRegenerate={handleRegenerateStudyPlan}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhum plano de estudos disponível ou usuário não autenticado.</div>
                                )
                            } />
                            <Route path="/image-analyzer" element={
                                user ? (
                                    <ImageAnalyzerView
                                        onAnalyze={handleAnalyzeImage}
                                        onBack={() => handleNavigate('/')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Usuário não autenticado.</div>
                                )
                            } />
                            <Route path="/review" element={
                                user && questionsToReview.length > 0 && currentAttempt ? (
                                    <ReviewView
                                        questions={questionsToReview}
                                        userAnswers={currentAttempt.userAnswers}
                                        onBackToResults={() => handleNavigate('/results')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Nenhuma questão para revisar, tentativa atual não definida ou usuário não autenticado.</div>
                                )
                            } />
                            <Route path="/flashcards" element={
                                user ? (
                                    <FlashcardView
                                        onBack={() => handleNavigate('/')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Usuário não autenticado.</div>
                                )
                            } />
                            <Route path="/history" element={
                                user ? (
                                    <AttemptHistoryView
                                        attempts={attempts}
                                        onBack={() => handleNavigate('/')}
                                        onViewDetails={(attempt) => {
                                            setCurrentAttempt(attempt); // Define a tentativa para visualização detalhada
                                            navigate(`/history/${attempt.timestamp}`); // Navega para a rota de detalhes
                                        }}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Usuário não autenticado.</div>
                                )
                            } />
                             <Route path="/history/:timestamp" element={
                                user && currentAttempt ? (
                                    <AttemptDetailsView
                                        attempt={currentAttempt}
                                        onBack={() => handleNavigate('/history')}
                                    />
                                ) : (
                                    <div className="text-center text-red-500 dark:text-red-400">Detalhes da tentativa não encontrados ou usuário não autenticado.</div>
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