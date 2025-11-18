

import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'; // Import React Router hooks and components
import { ExamData, Attempt, Question, UserAnswer, UploadedFile, User } from './types';
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
import LoginView from './components/LoginView';
import AttemptHistoryView from './components/AttemptHistoryView';
import AttemptDetailsView from './components/AttemptDetailsView';
// Fix: Import Sidebar as a named export
import Sidebar from './components/Sidebar'; // Importar o novo componente Sidebar como default


const App: React.FC = () => {
    // Removed appState, now using React Router for navigation state
    const location = useLocation();
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [examCode, setExamCode] = useState<string>('');
    const [extraTopics, setExtraTopics] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(10);
    
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswer>({});
    const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    // selectedAttemptDetails will be managed by route params
    const [studyPlan, setStudyPlan] = useState<string>('');
    const [questionsToReview, setQuestionsToReview] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [initialTimeLeft, setInitialTimeLeft] = useState<number | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
    const [generationStatus, setGenerationStatus] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Novo estado para o sidebar


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
                        // Simula o login para restaurar o estado
                        setUser({ id: 'mock-user-restored', email: 'restored@session.com'});
                        setExamData(savedExamData);
                        setUserAnswers(savedUserAnswers);
                        setAttempts(savedAttempts || []);
                        setInitialTimeLeft(savedTimeLeft);
                        navigate('/exam'); // Navigate to exam view
                    } else {
                        localStorage.removeItem('cortexExamProgress');
                    }
                }
            } catch (error) {
                console.error("Falha ao carregar o progresso salvo:", error);
                localStorage.removeItem('cortexExamProgress');
            }
        }
    }, [navigate]);

    // ===== Mock Authentication Handlers =====
    const handleLogin = (email: string) => {
        // Mock login: Em um app real, isso faria uma chamada de API.
        const mockUser: User = { id: `user_${Date.now()}`, email: email };
        setUser(mockUser);

        // Carrega as tentativas para este usuário
        const savedUserDataRaw = localStorage.getItem(`cortexUserData_${email}`);
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

        navigate('/'); // Navigate to config view after login
    };

    const handleLogout = () => {
        setUser(null);
        setAttempts([]); // Limpa as tentativas ao deslogar
        setIsSidebarOpen(false); // Fecha o sidebar ao deslogar
        navigate('/login'); // Redireciona para a página de login
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };


    const handleStartExam = useCallback(async (language: 'pt-BR' | 'en-US') => {
        if (!examCode || uploadedFiles.length === 0) {
            setError('Por favor, forneça um código de exame e pelo menos um material de estudo.');
            return;
        }
        setError(null);
        localStorage.removeItem('cortexExamProgress');
        // setAppState('generating'); // Replaced by conditional rendering based on loading state
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
            }
            setError(errorMessage);
            closeSidebar(); // Fecha o sidebar em caso de erro
            navigate('/'); // Navigate back to config view on error
        } finally {
            setGenerationStatus('');
        }
    }, [examCode, uploadedFiles, questionCount, extraTopics, attempts, navigate]);

    const handleFinishExam = useCallback((finalAnswers: UserAnswer) => {
        if (!examData || !user) return;
        
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
            localStorage.setItem(`cortexUserData_${user.email}`, JSON.stringify(userDataToSave));
        } catch (e) {
            console.error("Falha ao salvar os dados do usuário:", e);
        }

        setUserAnswers(finalAnswers);
        setCurrentAttempt(newAttempt);
        closeSidebar(); // Fecha o sidebar
        navigate('/results'); // Navigate to results view
        localStorage.removeItem('cortexExamProgress');

    }, [examData, user, attempts, navigate]);
    
    const handleGenerateStudyPlan = useCallback(async () => {
        if (!examData || !currentAttempt) return;

        // setAppState('generating_study_plan'); // Replaced by conditional rendering
        setGenerationStatus("Criando seu plano de estudos personalizado...");
        try {
            const plan = await generateStudyPlan(examData, userAnswers, currentAttempt);
            setStudyPlan(plan);
            closeSidebar(); // Fecha o sidebar
            navigate('/study-plan'); // Navigate to study plan view
        } catch (e) {
            console.error(e);
            setError('Falha ao gerar o plano de estudos.');
            closeSidebar(); // Fecha o sidebar
            navigate('/results'); // Navigate back to results on error
        } finally {
            setGenerationStatus('');
        }
    }, [examData, userAnswers, currentAttempt, navigate]);

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
        closeSidebar(); // Fecha o sidebar
        navigate('/review'); // Navigate to review view
    }, [examData, navigate]);

    const returnToConfig = () => {
        setExamData(null);
        setUserAnswers({});
        setCurrentAttempt(null);
        setStudyPlan('');
        setQuestionsToReview([]);
        setError(null);
        closeSidebar(); // Fecha o sidebar
        navigate('/'); // Navigate to config view
        localStorage.removeItem('cortexExamProgress');
    };
    
    const handleViewFlashcards = () => { closeSidebar(); navigate('/flashcards'); }; // Navigate to flashcards view
    const handleViewAttemptHistory = () => { closeSidebar(); navigate('/history'); }; // Navigate to history view
    const handleViewImageAnalyzer = () => { closeSidebar(); navigate('/image-analyzer'); }; // Navigate to image analyzer view
    const handleViewAttemptDetails = (attempt: Attempt) => {
        closeSidebar(); // Fecha o sidebar
        navigate(`/history/${attempt.timestamp}`); // Navigate to attempt details with timestamp
    };
    const handleBackFromAttemptDetails = () => navigate('/history'); // Navigate back to history


    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const showHeader = location.pathname !== '/login';

    // Helper to get attempt from URL timestamp
    const getAttemptByTimestamp = useCallback((timestamp: string | undefined): Attempt | null => {
        if (!timestamp) return null;
        return attempts.find(att => att.timestamp.toString() === timestamp) || null;
    }, [attempts]);

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {showHeader && user && (
                <Header 
                    theme={theme} 
                    onToggleTheme={toggleTheme} 
                    user={user} 
                    onLogout={handleLogout} 
                    onToggleSidebar={toggleSidebar} // Passa a função para o Header
                />
            )}
            
            <div className="flex flex-1 relative"> {/* Flex container para sidebar e conteúdo principal */}
                {showHeader && user && (
                    <Sidebar 
                        isOpen={isSidebarOpen} 
                        onClose={closeSidebar} 
                        onNavigate={navigate} // Passa a função navigate para o Sidebar
                    />
                )}

                {/* Overlay para fechar sidebar em mobile */}
                {isSidebarOpen && showHeader && user && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-30 md:hidden" 
                        onClick={closeSidebar}
                        aria-hidden="true"
                    ></div>
                )}
                
                <main className={`flex-grow container mx-auto p-4 md:p-8 fade-in ${isSidebarOpen ? 'md:ml-64' : ''} transition-all duration-300 ease-in-out`}>
                    <Routes>
                        <Route path="/login" element={<LoginView onLogin={handleLogin} />} />
                        <Route path="/" element={
                            user ? (
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
                                    onViewFlashcards={handleViewFlashcards}
                                    onViewAttemptHistory={handleViewAttemptHistory}
                                    onViewImageAnalyzer={handleViewImageAnalyzer} // Add new handler
                                    attempts={attempts}
                                    error={error}
                                />
                            ) : (
                                <LoginView onLogin={handleLogin} />
                            )
                        } />
                        <Route path="/generating" element={<LoadingIndicator message={generationStatus || "Gerando seu plano de estudo... A IA está analisando seus materiais e criando questões."} />} />
                        <Route path="/exam" element={
                            examData ? (
                                <ExamView 
                                    examData={examData} 
                                    onFinishExam={handleFinishExam} 
                                    initialAnswers={userAnswers}
                                    initialTimeLeft={initialTimeLeft}
                                    attempts={attempts}
                                />
                            ) : (
                                user ? <ConfigView 
                                    uploadedFiles={uploadedFiles}
                                    setUploadedFiles={setUploadedFiles}
                                    examCode={examCode}
                                    setExamCode={setExamCode}
                                    extraTopics={extraTopics}
                                    setExtraTopics={setExtraTopics}
                                    questionCount={questionCount}
                                    setQuestionCount={setQuestionCount}
                                    onStartExam={handleStartExam}
                                    onViewFlashcards={handleViewFlashcards}
                                    onViewAttemptHistory={handleViewAttemptHistory}
                                    onViewImageAnalyzer={handleViewImageAnalyzer}
                                    attempts={attempts}
                                    error={error}
                                /> : <LoginView onLogin={handleLogin} />
                            )
                        } />
                        <Route path="/results" element={
                            examData && currentAttempt ? (
                                <ResultsView 
                                    examData={examData} 
                                    userAnswers={userAnswers} 
                                    attempt={currentAttempt}
                                    history={attempts}
                                    onTryAgain={returnToConfig}
                                    onGenerateStudyPlan={handleGenerateStudyPlan}
                                    onStartReview={handleStartReview}
                                    onViewAttemptHistory={handleViewAttemptHistory}
                                />
                            ) : (
                                user ? <ConfigView 
                                    uploadedFiles={uploadedFiles}
                                    setUploadedFiles={setUploadedFiles}
                                    examCode={examCode}
                                    setExamCode={setExamCode}
                                    extraTopics={extraTopics}
                                    setExtraTopics={setExtraTopics}
                                    questionCount={questionCount}
                                    setQuestionCount={setQuestionCount}
                                    onStartExam={handleStartExam}
                                    onViewFlashcards={handleViewFlashcards}
                                    onViewAttemptHistory={handleViewAttemptHistory}
                                    onViewImageAnalyzer={handleViewImageAnalyzer}
                                    attempts={attempts}
                                    error={error}
                                /> : <LoginView onLogin={handleLogin} />
                            )
                        } />
                        <Route path="/generating-study-plan" element={<LoadingIndicator message="Criando seu plano de estudos personalizado..." />} />
                        <Route path="/study-plan" element={
                            examData ? (
                                <StudyPlanView 
                                    plan={studyPlan} 
                                    examCode={examData.examCode}
                                    onBackToResults={() => navigate('/results')} 
                                    onRegenerate={handleGenerateStudyPlan}
                                />
                            ) : (
                                user ? <ConfigView 
                                    uploadedFiles={uploadedFiles}
                                    setUploadedFiles={setUploadedFiles}
                                    examCode={examCode}
                                    setExamCode={setExamCode}
                                    extraTopics={extraTopics}
                                    setExtraTopics={setExtraTopics}
                                    questionCount={questionCount}
                                    setQuestionCount={setQuestionCount}
                                    onStartExam={handleStartExam}
                                    onViewFlashcards={handleViewFlashcards}
                                    onViewAttemptHistory={handleViewAttemptHistory}
                                    onViewImageAnalyzer={handleViewImageAnalyzer}
                                    attempts={attempts}
                                    error={error}
                                /> : <LoginView onLogin={handleLogin} />
                            )
                        } />
                        <Route path="/image-analyzer" element={<ImageAnalyzerView onAnalyze={handleAnalyzeImage} onBack={() => navigate('/')} />} />
                        <Route path="/review" element={
                            questionsToReview.length > 0 ? (
                                <ReviewView 
                                    questions={questionsToReview} 
                                    userAnswers={userAnswers} 
                                    onBackToResults={() => navigate('/results')} 
                                />
                            ) : (
                                user ? <ConfigView 
                                    uploadedFiles={uploadedFiles}
                                    setUploadedFiles={setUploadedFiles}
                                    examCode={examCode}
                                    setExamCode={setExamCode}
                                    extraTopics={extraTopics}
                                    setExtraTopics={setExtraTopics}
                                    questionCount={questionCount}
                                    setQuestionCount={setQuestionCount}
                                    onStartExam={handleStartExam}
                                    onViewFlashcards={handleViewFlashcards}
                                    onViewAttemptHistory={handleViewAttemptHistory}
                                    onViewImageAnalyzer={handleViewImageAnalyzer}
                                    attempts={attempts}
                                    error={error}
                                /> : <LoginView onLogin={handleLogin} />
                            )
                        } />
                        <Route path="/flashcards" element={<FlashcardView onBack={returnToConfig} />} />
                        <Route path="/history" element={
                            <AttemptHistoryView 
                                attempts={attempts} 
                                onBack={returnToConfig} 
                                onViewDetails={handleViewAttemptDetails} 
                            />
                        } />
                        <Route path="/history/:timestamp" element={
                            <AttemptDetailsView 
                                attempt={getAttemptByTimestamp(location.pathname.split('/').pop())} // Extract timestamp from URL
                                onBack={handleBackFromAttemptDetails} 
                            />
                        } />
                        <Route path="*" element={<p className="text-center text-red-500">Página não encontrada</p>} />
                    </Routes>
                </main>
            </div>
            <footer className="py-6 text-gray-500 dark:text-gray-500 text-sm fade-in" style={{ animationDelay: '200ms' }}>
                <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
                    <p>Desenvolvido com ❤️ por Amândio Vaz - 2025</p>
                    <p className="font-mono text-xs bg-gray-200/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">Release: v1.0</p>
                </div>
            </footer>
        </div>
    );
};

export default App;