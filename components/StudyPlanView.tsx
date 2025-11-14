
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowPathIcon } from './icons';

interface StudyPlanViewProps {
    plan: string;
    examCode: string;
    onBackToResults: () => void;
    onRegenerate: () => void;
}

const parseInlineMarkdown = (text: string): string => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-cyan-300 rounded px-1 py-0.5 font-mono text-sm">$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">$1</a>');
};


const StudyPlanView: React.FC<StudyPlanViewProps> = ({ plan, examCode, onBackToResults, onRegenerate }) => {
    const storageKey = `cortexStudyPlanCompleted_${examCode}`;
    const [completedTopics, setCompletedTopics] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse completed topics from localStorage", e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(completedTopics));
    }, [completedTopics, storageKey]);
    
    const handleToggleTopic = (topicText: string) => {
        setCompletedTopics(prev =>
            prev.includes(topicText)
                ? prev.filter(t => t !== topicText)
                : [...prev, topicText]
        );
    };

    const renderPlan = () => {
        const lines = plan.split('\n');
        return lines.map((line, index) => {
            if (line.trim().startsWith('### ')) {
                return <h3 key={index} className="text-xl font-semibold mt-6 mb-2 text-white" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line.replace('### ', '')) }} />;
            }
            if (line.trim().startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-8 mb-4 border-b border-gray-600 pb-2 text-cyan-400" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line.replace('## ', '')) }} />;
            }
            if (line.trim().startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold mt-6 mb-4 text-white" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line.replace('# ', '')) }} />;
            }
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const topicText = line.trim().substring(2).trim();
                const isCompleted = completedTopics.includes(topicText);
                return (
                    <div key={index} className="flex items-start gap-3 my-2 ml-4">
                        <input
                            type="checkbox"
                            id={`topic-${index}`}
                            checked={isCompleted}
                            onChange={() => handleToggleTopic(topicText)}
                            className="mt-1 h-5 w-5 rounded text-cyan-600 bg-gray-900 border-gray-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <label
                            htmlFor={`topic-${index}`}
                            className={`flex-1 text-gray-300 transition-colors cursor-pointer ${isCompleted ? 'line-through text-gray-500' : ''}`}
                            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(topicText) }} 
                        />
                    </div>
                );
            }
            if (line.trim() === '') {
                return <br key={index} />;
            }
            return <p key={index} className="my-2" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line) }} />;
        });
    };


    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <button onClick={onBackToResults} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar aos Resultados
                </button>
                 <button onClick={onRegenerate} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-semibold transition">
                    <ArrowPathIcon className="w-5 h-5" />
                    Regenerar Plano
                </button>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 md:p-8">
                <h1 className="text-3xl font-bold text-white mb-6">Seu Plano de Estudos Personalizado</h1>
                <div className="text-gray-300 leading-relaxed space-y-2">
                   {renderPlan()}
                </div>
            </div>
        </div>
    );
};

export default StudyPlanView;
