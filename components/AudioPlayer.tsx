
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SpeakerWaveIcon, PauseIcon } from './icons';

interface AudioPlayerProps {
    textToSpeak: string;
}

type AudioState = 'idle' | 'loading' | 'playing' | 'error';

// Global cache to avoid re-fetching audio for the same text across different components/renders.
const audioBufferCache = new Map<string, AudioBuffer>();
// A single AudioContext can be shared to be more efficient.
let audioContext: AudioContext | null = null;

const AudioPlayer: React.FC<AudioPlayerProps> = ({ textToSpeak }) => {
    const [audioState, setAudioState] = useState<AudioState>('idle');
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const isMountedRef = useRef(true);

    const getAudioContext = () => {
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContext;
    };
    
    const cleanup = useCallback(() => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.onended = null;
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore errors if stop is called on a source that hasn't started yet
            }
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            cleanup();
        };
    }, [cleanup]);
    
    // Stop audio if the text to speak changes
    useEffect(() => {
        cleanup();
        if (isMountedRef.current) {
            setAudioState('idle');
        }
    }, [textToSpeak, cleanup]);

    const playAudio = useCallback((buffer: AudioBuffer) => {
        const context = getAudioContext();
        if (!context) return;
        
        cleanup();

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        sourceNodeRef.current = source;
        if (isMountedRef.current) {
            setAudioState('playing');
        }

        source.onended = () => {
            if (isMountedRef.current) {
                setAudioState('idle');
            }
            sourceNodeRef.current = null;
        };
    }, [cleanup]);

    const handlePlayPause = async () => {
        const context = getAudioContext();
        if (context.state === 'suspended') {
            await context.resume();
        }

        if (audioState === 'playing') {
            cleanup();
            if (isMountedRef.current) {
                setAudioState('idle');
            }
        } else {
            try {
                if (audioBufferCache.has(textToSpeak)) {
                    playAudio(audioBufferCache.get(textToSpeak)!);
                    return;
                }
                
                if (isMountedRef.current) setAudioState('loading');
                const base64Audio = await generateSpeech(textToSpeak);
                
                if (!isMountedRef.current) return;

                const audioBuffer = await decodeAudioData(decode(base64Audio), context, 24000, 1);
                
                if (!isMountedRef.current) return;
                
                audioBufferCache.set(textToSpeak, audioBuffer);
                playAudio(audioBuffer);

            } catch (error) {
                console.error("Failed to play audio", error);
                if (isMountedRef.current) {
                    setAudioState('error');
                    setTimeout(() => {
                        if (isMountedRef.current) setAudioState('idle');
                    }, 2000);
                }
            }
        }
    };

    const renderIcon = () => {
        switch (audioState) {
            case 'loading':
                return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>;
            case 'playing':
                return <PauseIcon className="w-6 h-6" />;
            case 'error':
                 return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                 );
            default:
                return <SpeakerWaveIcon className="w-6 h-6" />;
        }
    };

    return (
        <button
            onClick={handlePlayPause}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-cyan-500 dark:text-cyan-400 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-wait ${audioState === 'error' ? 'text-red-500' : ''}`}
            disabled={audioState === 'loading'}
            aria-label={audioState === 'playing' ? 'Pausar áudio' : 'Reproduzir áudio da questão'}
            title={audioState === 'playing' ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
            {renderIcon()}
        </button>
    );
};

export default AudioPlayer;
