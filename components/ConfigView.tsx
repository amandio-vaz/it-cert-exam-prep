import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { UploadedFile, Attempt } from '../types';
import { fileToBase64, fileToArrayBuffer, uint8ArrayToBase64 } from '../utils/fileUtils';
import { CloudArrowUpIcon, SparklesIcon, RectangleStackIcon, InformationCircleIcon } from './icons';
import { PDFDocument } from 'pdf-lib';

interface ConfigViewProps {
    uploadedFiles: UploadedFile[];
    setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    examCode: string;
    setExamCode: (code: string) => void;
    extraTopics: string;
    setExtraTopics: (topics: string) => void;
    questionCount: number;
    setQuestionCount: (count: number) => void;
    attempts: Attempt[];
    onStartExam: (language: 'pt-BR' | 'en-US') => void;
    onViewFlashcards: () => void;
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

const logoBase64 = 'data:image/png;base64,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YjRy5EgVFBRUqVOnNCAgIGgVKlRIKioq1LNnz9Tw8HCVnZ0t161bp9LS0tKuXbsUGhpax44dUygoyL0z27dvl+vXr1dZWVnaunVr+Pjx4yosLMw1a9Zo0aJFat++fVq5cqXy2WefSbfddps6dOiQNm3aJO3atUtCQkKSkpKScvvtt8vd3T01adIk3XXXXdKuXbuktWvXav369dJnn30mly9f7uLx2bNny+PHj2tJSYnWr1+vhgwZIl26dEm6d++ehg4dKufOnRMWFhapVatW0qhRo+Tu3btp6NCh6t69u7Ru3To1atQo+fLlywVOnz4t33//vXx69tSNN94oV69eTdu3b5dPPvkkAwcOlBs3btCBAwfk5s2bhS+//DIdOnRIrly5Iq1bt+5vN27cqBMnTmjjxo36/fff1cCBAwUuXLig9u/fr5KSkvree+/ty5o7d66OHTsmnTt3Lgy09fX10rZt21RqaqpWrFigf/7zn2rWrFl6++239eWXX+qHH35Qffvttzpx4oR27dqln332mZ48eaIOHjxY2NjY6NSpU7r11lsVFBQU+nfffWd0dHSEhgYNHT9+3F0rS5YskY8++kht2rTJ4ODgyF6v9u3bK//zn/8I165dk7NnzxYWFinbtm2T8vJyCQkJSWJiopSVlaqrq2X27NkScnKyJCUlJU+fPlH79+/XSUlJcurUKencuXPi8fHxC12/bNky+eyzz+T58+eydOlSqaiosHDhQvXkyRPwwAMPSE9Pjzpy5Ii8+OKLcujQIXn16pVMnDhRHj58KHp7e7t4fPjwYbk/y5YtExsbG0lNTZUPHzygR48ehS5fvix6e3u7fN++XRavXq0++eQTWb58eSgoLS0dPXv2TEhISGjg4OE6deqUSktLe+n4qVOnyqRJk+Srr76SR48eSdu2bZNWrVpl7ltaWko//PCDZGRkyBtvvCG/+uorSUhIkC5dutjvM3jwYLl27Vrp3r27NGnSpLCxsbEuXbrI77//LtOmTZP09PRQXV2tf/7zn9KyZctSVFSUgoODZf369dK4cWOpqqpKPvroI2nVqpV07Ngxefr0aSF/RUVFCQgIkBkzZgijoaHSqVOnZPDgwfLee++JgYEBGThwoNSpU0e6desmn3zyyYLt9u/fL+3bt0+jR4+WMWPGyMSJE8Vo6urqZNGiRSoqKkr27t0rOzs7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';


const ConfigView: React.FC<ConfigViewProps> = ({
    uploadedFiles,
    setUploadedFiles,
    examCode,
    setExamCode,
    extraTopics,
    setExtraTopics,
    questionCount,
    setQuestionCount,
    attempts,
    onStartExam,
    onViewFlashcards,
    error
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [hasFlashcards, setHasFlashcards] = useState(false);
    const [language, setLanguage] = useState<'pt-BR' | 'en-US'>('pt-BR');
    const isFirstTime = attempts.length === 0;

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
        <div className="max-w-3xl mx-auto">
            {/* Nova Seção de Cabeçalho */}
            <div className="relative text-center bg-slate-900/50 backdrop-blur-lg rounded-2xl p-8 mb-10 border border-slate-700/50 shadow-2xl overflow-hidden">
                {/* Efeito de iluminação */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-purple-800/50 via-violet-700/30 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                
                 {/* Estrutura alterada para ser sempre uma coluna, garantindo o alinhamento central em todas as telas. */}
                <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                    <img src={logoBase64} alt="CortexPrepExam Logo" className="w-20 h-20" />
                    <div className="text-center">
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 mb-1">
                            {isFirstTime ? 'CortexPrepExam' : 'Gerar Novo Simulado'}
                        </h1>
                        <p className="text-lg text-slate-400 max-w-md mx-auto">
                            {isFirstTime 
                                ? 'Domine sua certificação com simulados gerados por Agentes IA Autônomos.'
                                : `Gere mais questões para o exame ${examCode || 'selecionado'} com seus materiais.`
                            }
                        </p>
                    </div>
                </div>
            </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md text-sm">
                                    <p className="truncate text-gray-300 pr-2">{file.name}</p>
                                    <button onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-300 font-bold text-lg px-2 flex-shrink-0">&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">2. Insira o código do exame</h2>
                        <div className="relative group">
                            <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-sm text-gray-200 bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible z-10">
                                Insira o código oficial da certificação (ex: AZ-900, CompTIA A+). Isso ajuda a IA a focar nos tópicos corretos.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                            </div>
                        </div>
                    </div>
                    <input 
                        type="text" 
                        id="exam-code" 
                        value={examCode} 
                        onChange={(e) => setExamCode(e.target.value)} 
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg shadow-sm focus:ring-violet-500/50 focus:border-violet-400 text-gray-200 p-3 transition-colors placeholder:text-gray-500" 
                        placeholder="Ex: AZ-104, CCNA 200-301..." 
                    />
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
                        {isFirstTime ? 'Gerar Plano de Estudo' : `Gerar ${questionCount} Novas Questões`}
                    </button>
                </div>
            </div>
            {hasFlashcards && (
                <div className="text-center mt-8">
                    <button 
                        onClick={onViewFlashcards} 
                        className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-slate-700/80 text-base font-medium rounded-xl text-gray-300 hover:bg-slate-800/50 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all duration-200"
                    >
                        <RectangleStackIcon className="w-5 h-5" />
                        Revisar Flashcards Salvos
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConfigView;