

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { UploadedFile, Attempt } from '../types';
import { fileToBase64, fileToArrayBuffer, uint8ArrayToBase64 } from '../utils/fileUtils';
import { CloudArrowUpIcon, SparklesIcon, RectangleStackIcon, InformationCircleIcon, ChartBarIcon, PhotoIcon } from './icons';
import { PDFDocument } from 'pdf-lib';
import { ALL_EXAM_CODES, POPULAR_EXAMS } from '../data/examCodes';

interface ConfigViewProps {
    uploadedFiles: UploadedFile[];
    setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    examCode: string;
    setExamCode: (code: string) => void;
    extraTopics: string;
    setExtraTopics: (topics: string) => void;
    questionCount: number;
    setQuestionCount: (count: number) => void;
    onStartExam: (language: 'pt-BR' | 'en-US') => void;
    onViewFlashcards: () => void;
    onViewAttemptHistory: () => void; // New prop for viewing attempt history
    onViewImageAnalyzer: () => void; // New prop for image analyzer
    attempts: Attempt[]; // New prop to check if history exists
    error: string | null;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_FILE_TYPES = [
    'application/pdf', 
    'text/markdown', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.docx', 
    'text/html', 
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];
const MAX_FILES = 10;

// Dicionário básico de termos de TI para o verificador ortográfico.
const IT_DICTIONARY = new Set([
  'azure', 'aws', 'gcp', 'ccna', 'comptia', 'firewall', 'subnet', 'vnet', 
  'kubernetes', 'docker', 'terraform', 'ansible', 'python', 'javascript',
  'ipv4', 'ipv6', 'dns', 'dhcp', 'vpn', 'sdk', 'api', 'saas', 'paas', 'iaas',
  'virtualização', 'roteamento', 'segurança', 'criptografia', 'autenticação'
]);

const ConfigView: React.FC<ConfigViewProps> = ({
    uploadedFiles,
    setUploadedFiles,
    examCode,
    setExamCode,
    extraTopics,
    setExtraTopics,
    questionCount,
    setQuestionCount,
    onStartExam,
    onViewFlashcards,
    onViewAttemptHistory, // Destructure new prop
    onViewImageAnalyzer, // Destructure new prop
    attempts, // Destructure new prop
    error
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [hasFlashcards, setHasFlashcards] = useState(false);
    const [language, setLanguage] = useState<'pt-BR' | 'en-US'>('pt-BR');
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
    const [isAutocompleteVisible, setIsAutocompleteVisible] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setIsAutocompleteVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        try {
            const storedFlashcards = localStorage.getItem('cortexFlashcards');
            if(storedFlashcards) {
                const parsed = JSON.parse(storedFlashcards);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setHasFlashcards(true);
                }
            }
        } catch (e) {
            console.error("Failed to check for flashcards in localStorage", e);
            setHasFlashcards(false);
        }
    }, []);

    const handleFileChange = useCallback(async (files: FileList | null) => {
        if (!files) return;
        setFileErrors([]); // Limpa erros e informações de uploads anteriores
        
        let processedFiles: UploadedFile[] = [];
        const currentErrors: string[] = [];
        let infoMessages: string[] = [];
        const PAGE_LIMIT = 1000;

        for (const file of Array.from(files)) {
            if (uploadedFiles.length + processedFiles.length >= MAX_FILES) {
                currentErrors.push(`Você pode carregar no máximo ${MAX_FILES} arquivos.`);
                break;
            }
            
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
            const acceptedMime = SUPPORTED_FILE_TYPES.includes(file.type) ||
                                 ['.pdf', '.md', '.docx', '.html', '.txt', '.jpeg', '.jpg', '.png', '.webp', '.gif'].includes(fileExtension);

            if (!acceptedMime) {
                currentErrors.push(`Tipo de arquivo não suportado para "${file.name}". Use PDF, MD, DOCX, HTML ou imagens.`);
                continue;
            }

            if (file.type === 'application/pdf') {
                if (file.size > MAX_FILE_SIZE) {
                    currentErrors.push(`O arquivo PDF "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB e não será processado.`);
                    continue;
                }
                try {
                    const arrayBuffer = await fileToArrayBuffer(file);
                    const pdfDoc = await PDFDocument.load(arrayBuffer);
                    const pageCount = pdfDoc.getPageCount();

                    if (pageCount > PAGE_LIMIT) {
                        const numChunks = Math.ceil(pageCount / PAGE_LIMIT);
                        if (uploadedFiles.length + processedFiles.length + numChunks > MAX_FILES) {
                            currentErrors.push(`O PDF "${file.name}" precisa ser dividido em ${numChunks} partes, o que excederia o limite total de ${MAX_FILES} arquivos.`);
                            continue;
                        }

                        infoMessages.push(`O PDF "${file.name}" era muito grande e foi dividido em ${numChunks} partes.`);

                        const chunkPromises = Array.from({ length: numChunks }, async (_, j) => {
                            const newPdfDoc = await PDFDocument.create();
                            const startPage = j * PAGE_LIMIT;
                            const endPage = Math.min(startPage + PAGE_LIMIT, pageCount);
                            const pageIndices = Array.from({ length: endPage - startPage }, (_, k) => startPage + k);
                            
                            const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
                            copiedPages.forEach(page => newPdfDoc.addPage(page));

                            const newPdfBytes = await newPdfDoc.save();
                            const base64Content = uint8ArrayToBase64(newPdfBytes);
                            
                            const chunkName = `${file.name.replace(/\.pdf$/i, '')}-parte${j + 1}.pdf`;
                            return {
                                name: chunkName,
                                type: 'application/pdf',
                                content: base64Content
                            };
                        });

                        const newChunks = await Promise.all(chunkPromises);
                        processedFiles.push(...newChunks);

                    } else {
                        const content = await fileToBase64(file);
                        processedFiles.push({ name: file.name, type: file.type, content });
                    }
                } catch (pdfError) {
                    console.error(`Erro ao processar o PDF "${file.name}":`, pdfError);
                    currentErrors.push(`Não foi possível processar o PDF "${file.name}". O arquivo pode estar corrompido ou protegido.`);
                    continue;
                }
            } else {
                 if (file.size > MAX_FILE_SIZE) {
                    currentErrors.push(`O arquivo "${file.name}" é muito grande (máx ${MAX_FILE_SIZE_MB}MB).`);
                    continue;
                }
                const content = await fileToBase64(file);
                processedFiles.push({ name: file.name, type: file.type || 'application/octet-stream', content });
            }
        }
        
        setFileErrors([...currentErrors, ...infoMessages]);
        if (processedFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...processedFiles].slice(0, MAX_FILES));
        }
    }, [setUploadedFiles, uploadedFiles.length]);

    const handleExamCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setExamCode(value);
        if (value) {
            const filtered = ALL_EXAM_CODES.filter(code =>
                code.toLowerCase().includes(value.toLowerCase())
            );
            setAutocompleteSuggestions(filtered);
            setIsAutocompleteVisible(true);
        } else {
            setIsAutocompleteVisible(false);
        }
    };

    const handleSuggestionClick = (code: string) => {
        setExamCode(code);
        setIsAutocompleteVisible(false);
    };


    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setFileErrors([]);
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
        }
    };
    
    const canStart = examCode.trim() !== '' && uploadedFiles.length > 0;

    // Lógica para o verificador ortográfico
    const spellCheckRenderer = useMemo(() => {
        // Adiciona o código do exame ao dicionário para não marcá-lo como erro
        const dynamicDictionary = new Set(IT_DICTIONARY);
        if (examCode) {
            dynamicDictionary.add(examCode.toLowerCase());
        }

        const checkWord = (word: string): boolean => {
            const cleanedWord = word.replace(/[.,!?;:()]/g, '').toLowerCase();
            // Não marca como erro: strings vazias, apenas pontuação, números ou palavras no dicionário
            if (!cleanedWord || !isNaN(Number(cleanedWord))) {
                return false;
            }
            return !dynamicDictionary.has(cleanedWord);
        };

        // Divide o texto, mas mantém os espaços e quebras de linha para alinhamento
        const parts = extraTopics.split(/(\s+)/);

        return parts.map((part, index) => {
            if (checkWord(part)) {
                return <span key={index} className="misspelled">{part}</span>;
            }
            // Retorna o texto original ou espaço/quebra de linha
            return <React.Fragment key={index}>{part}</React.Fragment>;
        });
    }, [extraTopics, examCode]);


    const commonTextAreaStyles = "w-full bg-slate-800/60 border border-slate-700 rounded-lg shadow-sm focus:ring-violet-500/50 focus:border-violet-400 text-gray-200 p-3 transition-colors placeholder:text-gray-500 whitespace-pre-wrap break-words";

    return (
        <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/70 backdrop-blur-lg rounded-2xl p-8 border border-slate-700/50 shadow-2xl space-y-8">
                
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">1. Adicione seus materiais de estudo</h2>
                    <label
                        htmlFor="file-upload-input"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center w-full p-6 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${isDragging ? 'scale-105 border-violet-400 bg-violet-500/20 shadow-lg shadow-violet-500/20' : 'hover:border-slate-500 hover:bg-slate-800/20'}`}
                    >
                         {isDragging ? (
                            <>
                                <CloudArrowUpIcon className="h-12 w-12 text-violet-400 mb-3 animate-pulse" />
                                <p className="text-lg font-semibold text-violet-300">
                                    Solte para carregar!
                                </p>
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-10 w-10 text-gray-500 mb-3" />
                                <p className="text-sm text-gray-400">
                                    <span className="font-semibold text-gray-300">Arraste e solte</span> até {MAX_FILES} arquivos aqui
                                </p>
                                <p className="text-xs text-gray-500">ou clique para selecionar (PDF, MD, DOCX, HTML, Imagens)</p>
                            </>
                        )}
                        <input id="file-upload-input" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => handleFileChange(e.target.files)} accept={SUPPORTED_FILE_TYPES.join(',')} />
                    </label>
                    <p className="text-xs text-gray-500 text-center -mt-2">
                        Limite por arquivo: {MAX_FILE_SIZE_MB}MB. PDFs com mais de 1000 páginas serão divididos.
                    </p>
                     {fileErrors.length > 0 && (
                        <div className="space-y-1">
                            {fileErrors.map((msg, index) => {
                                const isInfo = msg.includes('foi dividido');
                                return <p key={index} className={`text-sm ${isInfo ? 'text-cyan-400' : 'text-red-400'}`}>{msg}</p>;
                            })}
                        </div>
                     )}
                     {uploadedFiles.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="text-sm text-gray-400 dark:text-gray-500">
                                {uploadedFiles.length} de {MAX_FILES} arquivos carregados
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                    className="bg-violet-500 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${(uploadedFiles.length / MAX_FILES) * 100}%` }}
                                ></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md text-sm">
                                        <p className="truncate text-gray-300 pr-2">{file.name}</p>
                                        <button onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-300 font-bold text-lg px-2 flex-shrink-0">&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                 <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">2. Insira o código do exame</h2>
                        <div className="relative group">
                            <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-sm text-gray-200 bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible z-10">
                                Insira o código oficial da certificação (ex: AZ-900). Isso ajuda a IA a focar nos tópicos corretos.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                         <p className="text-xs text-gray-400 font-medium mr-2">Populares:</p>
                        {POPULAR_EXAMS.map(exam => (
                             <button
                                key={exam.code}
                                onClick={() => setExamCode(exam.code)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-full transition-colors duration-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-gray-300 hover:text-white"
                            >
                                {exam.code}
                            </button>
                        ))}
                    </div>

                    <div className="relative" ref={autocompleteRef}>
                        <input
                            type="text"
                            id="exam-code"
                            value={examCode}
                            onChange={handleExamCodeChange}
                            onFocus={() => setIsAutocompleteVisible(true)}
                            autoComplete="off"
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg shadow-sm focus:ring-violet-500/50 focus:border-violet-400 text-gray-200 p-3 transition-colors placeholder:text-gray-500"
                            placeholder="Ex: AZ-104, CCNA 200-301..."
                        />
                        {isAutocompleteVisible && autocompleteSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md shadow-lg">
                                {autocompleteSuggestions.map(code => (
                                    <li
                                        key={code}
                                        onClick={() => handleSuggestionClick(code)}
                                        className="px-4 py-2 text-gray-300 hover:bg-slate-700 cursor-pointer"
                                    >
                                        {code}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-white">3. Questões</h2>
                        <input 
                            type="number" 
                            id="question-count" 
                            value={questionCount} 
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setQuestionCount(Math.max(5, Math.min(50, value || 5)));
                            }}
                            min="5"
                            max="50"
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg shadow-sm focus:ring-violet-500/50 focus:border-violet-400 text-gray-200 p-3 transition-colors placeholder:text-gray-500" 
                        />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-white">4. Idioma</h2>
                        <div className="flex bg-slate-800/60 border border-slate-700 rounded-lg p-1">
                             <button onClick={() => setLanguage('pt-BR')} className={`w-1/2 rounded-md py-2 text-sm font-semibold transition-colors ${language === 'pt-BR' ? 'bg-violet-500 text-white' : 'text-gray-400 hover:bg-slate-700/50'}`}>
                                Português (BR)
                            </button>
                            <button onClick={() => setLanguage('en-US')} className={`w-1/2 rounded-md py-2 text-sm font-semibold transition-colors ${language === 'en-US' ? 'bg-violet-500 text-white' : 'text-gray-400 hover:bg-slate-700/50'}`}>
                                English (US)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                     <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">5. Adicione Tópicos Extras (Opcional)</h2>
                         <div className="relative group">
                            <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-sm text-gray-200 bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible z-10">
                                Adicione temas específicos, perguntas ou conceitos que você deseja que a IA priorize ao gerar as questões. Use uma linha para cada tópico.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        {/* Camada de destaque (atrás da textarea) */}
                        <div
                            aria-hidden="true"
                            className={`absolute inset-0 pointer-events-none text-transparent ${commonTextAreaStyles} border-transparent focus:outline-none`}
                        >
                           {spellCheckRenderer}
                        </div>
                         {/* Textarea real (com fundo transparente) */}
                        <textarea
                            id="extra-topics"
                            value={extraTopics}
                            onChange={(e) => setExtraTopics(e.target.value)}
                            rows={3}
                            className={`relative z-10 bg-transparent caret-violet-400 ${commonTextAreaStyles}`}
                            placeholder="Liste tópicos ou perguntas específicas que você quer cobrir, um por linha..."
                            spellCheck={false} // Desativa o verificador nativo para não haver conflito visual
                        />
                    </div>
                </div>

                <div className="pt-4">
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <button 
                        onClick={() => onStartExam(language)} 
                        disabled={!canStart} 
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 disabled:from-slate-600 disabled:to-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-all duration-200 shadow-lg hover:shadow-violet-500/30"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Gerar Simulado
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {hasFlashcards && (
                    <div className="text-center">
                        <button 
                            onClick={onViewFlashcards} 
                            className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-slate-700/80 text-base font-medium rounded-xl text-gray-300 hover:bg-slate-800/50 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all duration-200 w-full"
                        >
                            <RectangleStackIcon className="w-5 h-5" />
                            Revisar Flashcards Salvos
                        </button>
                    </div>
                )}
                {attempts.length > 0 && (
                    <div className="text-center">
                        <button 
                            onClick={onViewAttemptHistory} 
                            className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-slate-700/80 text-base font-medium rounded-xl text-gray-300 hover:bg-slate-800/50 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-all duration-200 w-full"
                        >
                            <ChartBarIcon className="w-5 h-5" />
                            Ver Histórico de Exames
                        </button>
                    </div>
                )}
                <div className="text-center md:col-span-2">
                    <button
                        onClick={onViewImageAnalyzer}
                        className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-slate-700/80 text-base font-medium rounded-xl text-gray-300 hover:bg-slate-800/50 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-orange-500 transition-all duration-200 w-full"
                    >
                        <PhotoIcon className="w-5 h-5" />
                        Analisar Imagem com IA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigView;