
import React, { useState, useCallback } from 'react';
import { UploadedFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import LoadingIndicator from './LoadingIndicator';
import { PhotoIcon, ArrowLeftIcon, SparklesIcon } from './icons';

interface ImageAnalyzerViewProps {
    onAnalyze: (file: UploadedFile, prompt: string) => Promise<string>;
    onBack: () => void;
}

const ImageAnalyzerView: React.FC<ImageAnalyzerViewProps> = ({ onAnalyze, onBack }) => {
    const [imageFile, setImageFile] = useState<UploadedFile | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const content = await fileToBase64(file);
                const uploadedFile = { name: file.name, type: file.type, content };
                setImageFile(uploadedFile);

                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                };
                reader.readAsDataURL(file);

                setAnalysis('');
                setError(null);
            } catch (err) {
                setError("Falha ao carregar a imagem.");
            }
        }
    }, []);

    const handleAnalyzeClick = async () => {
        if (!imageFile || !prompt) {
            setError("Por favor, carregue uma imagem e escreva uma pergunta.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');
        try {
            const result = await onAnalyze(imageFile, prompt);
            setAnalysis(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
             <button onClick={onBack} className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                Voltar à Configuração
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 flex flex-col shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">Analisador de Imagem</h2>
                    <div className="flex-grow flex flex-col gap-4">
                        <div className="w-full h-64 bg-slate-800/60 rounded-md flex items-center justify-center overflow-hidden border border-slate-700">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <PhotoIcon className="w-16 h-16 mx-auto"/>
                                    <p>Pré-visualização da imagem</p>
                                </div>
                            )}
                        </div>
                        <input type="file" id="image-upload" onChange={handleFileChange} accept="image/*" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/50 file:text-cyan-300 hover:file:bg-cyan-900/70 transition-colors" />
                        
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-md focus:ring-cyan-500/50 focus:border-cyan-400 text-gray-200 p-2 transition-colors"
                            placeholder="Ex: Explique este diagrama de arquitetura de nuvem..."
                        />
                    </div>
                     <button onClick={handleAnalyzeClick} disabled={isLoading || !imageFile || !prompt} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 shadow-lg hover:shadow-indigo-500/30">
                        <SparklesIcon className="w-5 h-5" />
                        Analisar com Gemini
                    </button>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">Análise</h2>
                    <div className="w-full h-full min-h-[300px] bg-slate-800/60 rounded-md p-4 text-gray-300 overflow-y-auto border border-slate-700">
                        {isLoading && <LoadingIndicator message="Analisando..." />}
                        {error && <p className="text-red-400">{error}</p>}
                        {analysis && <p className="whitespace-pre-wrap">{analysis}</p>}
                        {!isLoading && !analysis && !error && <p className="text-gray-500">A análise da imagem aparecerá aqui.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalyzerView;