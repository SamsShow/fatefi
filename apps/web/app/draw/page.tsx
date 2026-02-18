'use client';

import { useEffect, useState } from 'react';
import { Moon, AlertCircle, BrainCircuit, Lock, MousePointerClick, Loader2 } from 'lucide-react';
import TarotCard from '@/components/TarotCard';
import PredictionForm from '@/components/PredictionForm';
import { getTodayDraw, getTodayPrediction } from '@/lib/api';
import { isConnected } from '@/lib/wallet';

interface DrawData {
    id: number;
    card_name: string;
    orientation: 'upright' | 'reversed';
    date: string;
    ai_interpretation: {
        prediction: string;
        narrative: string;
        confidence_tone: string;
        disclaimer: string;
    } | null;
}

export default function DrawPage() {
    const [draw, setDraw] = useState<DrawData | null>(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);
    const [alreadyPredicted, setAlreadyPredicted] = useState(false);
    const [existingPrediction, setExistingPrediction] = useState<any>(null);

    useEffect(() => {
        loadDraw();
    }, []);

    async function loadDraw() {
        try {
            const data = await getTodayDraw();
            setDraw(data);

            if (isConnected()) {
                try {
                    const pred = await getTodayPrediction();
                    if (pred) {
                        setAlreadyPredicted(true);
                        setExistingPrediction(pred);
                    }
                } catch {
                    // Not logged in or no prediction
                }
            }
        } catch (err) {
            console.error('Failed to load draw:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <Loader2 size={48} className="mx-auto mb-4 text-accent-purple animate-spin" />
                <div className="text-xl text-foreground/50">Consulting the cosmos...</div>
                <div className="mt-6 w-64 h-px mx-auto rounded-full shimmer" />
            </div>
        );
    }

    if (!draw) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <AlertCircle size={48} className="mx-auto mb-4 text-foreground/30" />
                <div className="text-xl text-foreground/50">The spirits are silent. Try again later.</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Date Header */}
            <div className="text-center mb-8">
                <div className="text-sm text-accent-purple font-mono tracking-wider mb-2 opacity-75">
                    DAILY TAROT · {new Date(draw.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold gradient-text">Today&apos;s Reading</h1>
            </div>

            {/* Card */}
            <div className="mb-10">
                <TarotCard
                    cardName={draw.card_name}
                    orientation={draw.orientation}
                    isRevealed={revealed}
                    onReveal={() => setRevealed(true)}
                />
            </div>

            {/* AI Interpretation */}
            {revealed && draw.ai_interpretation && (
                <div className="glass-card p-6 md:p-8 mb-8 animate-[fadeIn_0.5s_ease-out]">
                    <div className="flex items-center gap-2 mb-5">
                        <BrainCircuit size={20} className="text-accent-purple shrink-0" />
                        <h2 className="text-lg font-bold">Oracle&apos;s Interpretation</h2>
                        <span className="ml-auto text-xs px-3 py-1 rounded-full bg-accent-purple/15 text-accent-purple font-medium border border-accent-purple/20">
                            {draw.ai_interpretation.confidence_tone}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-accent-gold font-mono tracking-wider mb-1.5 opacity-75">PREDICTION</div>
                            <p className="text-foreground/80 leading-relaxed">{draw.ai_interpretation.prediction}</p>
                        </div>

                        <div className="w-full h-px bg-white/8" />

                        <div>
                            <div className="text-xs text-accent-gold font-mono tracking-wider mb-1.5 opacity-75">NARRATIVE</div>
                            <p className="text-foreground/65 leading-relaxed italic font-serif">{draw.ai_interpretation.narrative}</p>
                        </div>

                        <div className="text-xs text-foreground/30 bg-white/4 px-3 py-2 rounded-lg border border-white/5">
                            {draw.ai_interpretation.disclaimer}
                        </div>
                    </div>
                </div>
            )}

            {/* Prediction Form or Already Predicted */}
            {revealed && (
                <div className="animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                    {alreadyPredicted ? (
                        <div className="glass-card p-6 text-center">
                            <Lock size={32} className="mx-auto mb-3 text-accent-gold" />
                            <h3 className="text-lg font-bold text-accent-gold mb-1">Prediction Locked</h3>
                            <p className="text-sm text-foreground/60 mb-3">
                                You predicted <strong className="text-accent-purple">{existingPrediction?.selected_option?.toUpperCase()}</strong> for today.
                            </p>
                            <p className="text-xs text-foreground/30">Come back tomorrow for a new card!</p>
                        </div>
                    ) : (
                        <PredictionForm onSubmitted={() => setAlreadyPredicted(true)} />
                    )}
                </div>
            )}

            {/* Tap hint */}
            {!revealed && (
                <div className="text-center text-foreground/30 text-sm flex items-center justify-center gap-2">
                    <MousePointerClick size={14} />
                    Tap the card to reveal your daily reading
                </div>
            )}
        </div>
    );
}
