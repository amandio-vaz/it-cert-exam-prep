
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadedFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import LoadingIndicator from './LoadingIndicator';
import { PhotoIcon, ArrowLeftIcon, SparklesIcon } from './icons';

interface ImageAnalyzerViewProps {
    onAnalyze: (file: UploadedFile, prompt: string) => Promise<string>;
    onBack: () => void;
}

// Helper to parse basic Markdown into HTML strings for rendering
const parseMarkdown = (text: string): string => {
    return text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italics
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Headers
        .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-gray-800 dark:text-white">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-indigo-600 dark:text-indigo-400">$1</h2>')
        // Lists
        .replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>')
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-600 dark:text-cyan-400 hover:underline">$1</a>')
        // Code blocks (inline)
        .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-cyan-700 dark:bg-gray-700 dark:text-cyan-300 rounded px-1 py-0.5 font-mono text-sm">$1</code>')
        // Line breaks
        .replace(/\n/g, '<br />');
};

const ImageAnalyzerView: React.FC<ImageAnalyzerViewProps> = ({ onAnalyze, onBack }) => {
    const [imageFile, setImageFile] = useState<UploadedFile | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const isMountedRef = useRef(true); // Referência para verificar se o componente está montado

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Adiciona validação para garantir que é um arquivo de imagem
            if (!file.type.startsWith('image/')) {
                if (isMountedRef.current) {
                    setFileError('Arquivo inválido. Por favor, selecione uma imagem (ex: PNG, JPG, WEBP).');
                    setImageFile(null);
                    setImagePreview(null);
                }
                e.target.value = ''; // Reseta o input de arquivo
                return;
            }

            try {
                if (isMountedRef.current) {
                    setFileError(null); // Limpa erros anteriores de arquivo
                }
                const content = await fileToBase64(file);
                
                if (!isMountedRef.current) return; // Parar se o componente foi desmontado durante a espera
                
                const uploadedFile = { name: file.name, type: file.type, content };
                setImageFile(uploadedFile);

                const reader = new FileReader();
                reader.onloadend = () => {
                    if (isMountedRef.current) {
                        setImagePreview(reader.result as string);
                    }
                };
                reader.readAsDataURL(file);

                if (isMountedRef.current) {
                    setAnalysis('');
                    setError(null);
                }
            } catch (err) {
                if (isMountedRef.current) {
                    setFileError("Falha ao processar a imagem.");
                }
            }
        }
    }, []);

    const handleAnalyzeClick = async () => {
        if (!imageFile || !prompt) {
            if (isMountedRef.current) setError("Por favor, carregue uma imagem e escreva uma pergunta.");
            return;
        }
        if (fileError) return;

        if (isMountedRef.current) setIsLoading(true);
        if (isMountedRef.current) setError(null);
        if (isMountedRef.current) setAnalysis('');
        try {
            const result = await onAnalyze(imageFile, prompt);
            if (isMountedRef.current) setAnalysis(result);
        } catch (err) {
            if (isMountedRef.current) setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
             <button onClick={onBack} className="flex items-center gap-2 mb-6 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                Voltar à Configuração
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 flex flex-col shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Analisador de Imagem</h2>
                    <div className="flex-grow flex flex-col gap-4">
                        <div className="w-full h-64 bg-gray-100 dark:bg-slate-800/60 rounded-md flex items-center justify-center overflow-hidden border border-gray-300 dark:border-slate-700">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-400 dark:text-gray-500">
                                    <PhotoIcon className="w-16 h-16 mx-auto"/>
                                    <p>Pré-visualização da imagem</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <input type="file" id="image-upload" onChange={handleFileChange} accept="image/*" className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-100 dark:file:bg-cyan-900/50 file:text-cyan-700 dark:file:text-cyan-300 hover:file:bg-cyan-200 dark:hover:file:bg-cyan-900/70 transition-colors" />
                            {fileError && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{fileError}</p>}
                        </div>
                        
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-800 dark:text-gray-200 p-2 transition-colors"
                            placeholder="Ex: Explique este diagrama de arquitetura de nuvem..."
                        />
                    </div>
                     <button onClick={handleAnalyzeClick} disabled={isLoading || !imageFile || !prompt} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 shadow-lg hover:shadow-indigo-500/30">
                        <SparklesIcon className="w-5 h-5" />
                        Analisar com Gemini
                    </button>
                </div>
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Análise</h2>
                    <div className="w-full h-full min-h-[300px] bg-gray-100 dark:bg-slate-800/60 rounded-md p-4 text-gray-700 dark:text-gray-300 overflow-y-auto border border-gray-300 dark:border-slate-700">
                        {isLoading && <LoadingIndicator message="Analisando..." />}
                        {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
                        {analysis && <div className="text-gray-700 dark:text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }} />}
                        {!isLoading && !analysis && !error && <p className="text-gray-400 dark:text-gray-500">A análise da imagem aparecerá aqui.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalyzerView;
