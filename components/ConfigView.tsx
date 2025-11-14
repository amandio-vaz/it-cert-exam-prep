
import React, { useCallback, useState } from 'react';
import { UploadedFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import { DocumentIcon, LinkIcon, CodeBracketIcon, SparklesIcon, CpuChipIcon, PhotoIcon } from './icons';

interface ConfigViewProps {
    uploadedFiles: UploadedFile[];
    setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    urls: string;
    setUrls: (urls: string) => void;
    examCode: string;
    setExamCode: (code: string) => void;
    questionCount: number;
    setQuestionCount: (count: number) => void;
    useThinkingMode: boolean;
    setUseThinkingMode: (use: boolean) => void;
    onStartExam: () => void;
    onAnalyzeImageClick: () => void;
    error: string | null;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_FILE_TYPES = ['application/pdf', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html', 'text/plain'];
const MAX_FILES = 10;

const ConfigView: React.FC<ConfigViewProps> = ({
    uploadedFiles,
    setUploadedFiles,
    urls,
    setUrls,
    examCode,
    setExamCode,
    questionCount,
    setQuestionCount,
    useThinkingMode,
    setUseThinkingMode,
    onStartExam,
    onAnalyzeImageClick,
    error
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [urlError, setUrlError] = useState<string | null>(null);

    const handleFileChange = useCallback(async (files: FileList | null) => {
        if (!files) return;
        const newFiles: UploadedFile[] = [];
        const currentErrors: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (uploadedFiles.length + newFiles.length >= MAX_FILES) {
                currentErrors.push(`Você pode carregar no máximo ${MAX_FILES} arquivos.`);
                break;
            }
            if (file.size > MAX_FILE_SIZE) {
                currentErrors.push(`O arquivo "${file.name}" é muito grande (máx ${MAX_FILE_SIZE_MB}MB).`);
                continue;
            }
            // A simple check for file extension as a fallback for MIME type
            const fileExtension = `.${file.name.split('.').pop()}`;
            const acceptedMime = SUPPORTED_FILE_TYPES.includes(file.type) || ['.pdf', '.md', '.docx', '.html', '.txt'].includes(fileExtension);

            if (!acceptedMime) {
                currentErrors.push(`Tipo de arquivo não suportado para "${file.name}". Use PDF, MD, DOCX, HTML.`);
                continue;
            }
            const content = await fileToBase64(file);
            newFiles.push({ name: file.name, type: file.type || 'application/octet-stream', content });
        }
        
        setFileErrors(currentErrors);
        setUploadedFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
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

    const validateUrls = (urlList: string): boolean => {
        setUrlError(null);
        if (urlList.trim() === '') return true;
        const urlsArray = urlList.split('\n').filter(u => u.trim() !== '');
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
        
        const invalidUrls = urlsArray.filter(url => !urlRegex.test(url.trim()));

        if (invalidUrls.length > 0) {
            setUrlError(`URL inválida detectada: "${invalidUrls[0]}". Verifique o formato.`);
            return false;
        }
        return true;
    };
    
    const handleUrlDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedText = e.dataTransfer.getData('text/plain');
        if (droppedText) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const foundUrls = droppedText.match(urlRegex);
            if (foundUrls) {
                const newUrls = foundUrls.join('\n');
                const updatedUrls = urls.trim() === '' ? newUrls : `${urls}\n${newUrls}`;
                setUrls(updatedUrls);
                validateUrls(updatedUrls);
            }
        }
    };

    const handleUrlDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleStartClick = () => {
        const areUrlsValid = validateUrls(urls);
        if (canStart && areUrlsValid) {
            onStartExam();
        }
    };
    
    const canStart = examCode.trim() !== '' && (uploadedFiles.length > 0 || urls.trim() !== '');

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">1. Forneça o material de estudo</h2>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
                            Arquivos (PDF, MD, DOCX, HTML - máx {MAX_FILES})
                        </label>
                        <label
                            htmlFor="file-upload-input"
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className={`flex justify-center w-full px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-md cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-slate-800/50' : 'hover:border-slate-500'}`}
                        >
                            <div className="space-y-1 text-center">
                                <DocumentIcon className="mx-auto h-12 w-12 text-gray-500" />
                                <div className="flex text-sm text-gray-400">
                                    <p className="pl-1">Arraste e solte arquivos aqui, ou clique para selecionar</p>
                                </div>
                                <p className="text-xs text-gray-500">{uploadedFiles.length} de {MAX_FILES} arquivos selecionados</p>
                            </div>
                            <input id="file-upload-input" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => handleFileChange(e.target.files)} accept={SUPPORTED_FILE_TYPES.join(',')} />
                        </label>
                         {fileErrors.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {fileErrors.map((error, index) => <p key={index} className="text-red-400 text-sm">{error}</p>)}
                            </div>
                         )}
                         {uploadedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md text-sm">
                                        <p className="truncate text-gray-300">{file.name}</p>
                                        <button onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-300 font-bold text-lg px-2">&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="urls" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                            <LinkIcon className="w-4 h-4" />
                            URLs (um por linha, ou arraste e solte links aqui)
                        </label>
                        <textarea 
                            id="urls" 
                            name="urls" 
                            rows={4} 
                            value={urls} 
                            onChange={(e) => setUrls(e.target.value)} 
                            onBlur={() => validateUrls(urls)}
                            onDrop={handleUrlDrop}
                            onDragOver={handleUrlDragOver}
                            className={`w-full bg-slate-800/60 border rounded-md shadow-sm focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-200 p-2 transition-colors ${urlError ? 'border-red-500/50' : 'border-slate-700'}`} 
                            placeholder="https://...&#10;https://..."
                            aria-invalid={!!urlError}
                            aria-describedby="url-error"
                        ></textarea>
                        {urlError && <p id="url-error" className="text-red-400 text-sm mt-1">{urlError}</p>}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">2. Detalhes do Exame</h2>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="exam-code" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                           <CodeBracketIcon className="w-4 h-4" />
                            Código do Exame
                        </label>
                        <input type="text" id="exam-code" value={examCode} onChange={(e) => setExamCode(e.target.value)} className="w-full bg-slate-800/60 border border-slate-700 rounded-md shadow-sm focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-200 p-2 transition-colors" placeholder="ex: AZ-900, CCNA 200-301" />
                    </div>
                    <div>
                        <label htmlFor="question-count" className="block text-sm font-medium text-gray-300 mb-2">Número de Questões</label>
                        <input type="number" id="question-count" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min="1" max="50" className="w-full bg-slate-800/60 border border-slate-700 rounded-md shadow-sm focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-200 p-2 transition-colors" />
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-md border border-slate-700">
                        <div className="flex items-center gap-2">
                            <CpuChipIcon className="w-5 h-5 text-cyan-400"/>
                            <label htmlFor="thinking-mode" className="font-medium text-white">Modo de Pensamento Profundo</label>
                        </div>
                        <label htmlFor="thinking-mode" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="thinking-mode" className="sr-only peer" checked={useThinkingMode} onChange={(e) => setUseThinkingMode(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                    </div>
                    <p className="text-xs text-gray-400">Ative para consultas mais complexas. Usa um modelo mais avançado (gemini-2.5-pro) e pode levar mais tempo.</p>
                </div>
            </div>
            
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg flex flex-col justify-between">
                 <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Outras Ferramentas</h2>
                    <button onClick={onAnalyzeImageClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-indigo-500/30">
                       <PhotoIcon className="w-5 h-5" />
                        Analisar Imagem
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Faça upload de um diagrama ou captura de tela para obter uma explicação.</p>
                </div>

                <div className="mt-6">
                    {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                    <button onClick={handleStartClick} disabled={!canStart} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-bold rounded-md text-black bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-200 shadow-lg hover:shadow-cyan-400/30">
                        <SparklesIcon className="w-5 h-5" />
                        Gerar Exame Simulado
                    </button>
                </div>
            </div>

        </div>
    );
};

export default ConfigView;