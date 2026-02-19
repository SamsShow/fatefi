'use client';

import { useEffect, useState } from 'react';
import { Moon, AlertCircle, BrainCircuit, Lock, MousePointerClick, Loader2, CalendarDays, Wallet } from 'lucide-react';
import TarotCard from '@/components/TarotCard';
import PredictionForm from '@/components/PredictionForm';
import EthPriceTicker from '@/components/EthPriceTicker';
import YesterdayResult from '@/components/YesterdayResult';
import PoolStats from '@/components/PoolStats';
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

type Tab = 'today' | 'yesterday';

export default function DrawPage() {
    const [tab, setTab] = useState<Tab>('today');
    const [connected, setConnected] = useState(false);
    const [draw, setDraw] = useState<DrawData | null>(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);
    const [alreadyPredicted, setAlreadyPredicted] = useState(false);
    const [existingPrediction, setExistingPrediction] = useState<any>(null);

    useEffect(() => {
        const syncAuth = () => {
            const hasAuth = isConnected();
            setConnected(hasAuth);
            if (hasAuth) {
                void loadDraw();
            } else {
                setDraw(null);
                setRevealed(false);
                setAlreadyPredicted(false);
                setExistingPrediction(null);
                setLoading(false);
            }
        };

        syncAuth();
        window.addEventListener('fatefi-auth-changed', syncAuth);
        return () => window.removeEventListener('fatefi-auth-changed', syncAuth);
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

    if (!connected) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="glass-card p-8 md:p-10 text-center">
                    <Wallet size={36} className="mx-auto mb-4 text-accent-purple" />
                    <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-3">Connect Wallet to Unlock Readings</h1>
                    <p className="text-foreground/55">
                        Daily tarot, live ETH data, and yesterday&apos;s market results are only visible after wallet authentication.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Tab Bar */}
            <div className="flex items-center justify-center gap-1 mb-6">
                <button
                    onClick={() => setTab('today')}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                        ${tab === 'today'
                            ? 'bg-accent-purple text-white shadow-card'
                            : 'text-foreground/45 hover:text-foreground hover:bg-white/5'}`}
                >
                    <Moon size={14} />
                    Today
                </button>
                <button
                    onClick={() => setTab('yesterday')}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                        ${tab === 'yesterday'
                            ? 'bg-accent-purple text-white shadow-card'
                            : 'text-foreground/45 hover:text-foreground hover:bg-white/5'}`}
                >
                    <CalendarDays size={14} />
                    Yesterday
                </button>
            </div>

            {/* ─── TODAY TAB ─── */}
            {tab === 'today' && (
                <>
                    {/* ETH Price Ticker */}
                    <div className="mb-6">
                        <EthPriceTicker />
                    </div>

                    {/* Date Header */}
                    <div className="text-center mb-8">
                        <div className="text-sm text-accent-purple font-mono tracking-wider mb-2 opacity-75">
                            DAILY TAROT · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold gradient-text">Today&apos;s Reading</h1>
                    </div>

                    {loading ? (
                        <div className="text-center py-16">
                            <Loader2 size={48} className="mx-auto mb-4 text-accent-purple animate-spin" />
                            <div className="text-xl text-foreground/50">Consulting the cosmos...</div>
                            <div className="mt-6 w-64 h-px mx-auto rounded-full shimmer" />
                        </div>
                    ) : !draw ? (
                        <div className="text-center py-16">
                            <AlertCircle size={48} className="mx-auto mb-4 text-foreground/30" />
                            <div className="text-xl text-foreground/50">The spirits are silent. Try again later.</div>
                        </div>
                    ) : (
                        <>
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

                            {/* Pool Stats */}
                            {revealed && (
                                <div className="animate-[fadeIn_0.3s_ease-out]">
                                    <PoolStats />
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
                        </>
                    )}
                </>
            )}

            {/* ─── YESTERDAY TAB ─── */}
            {tab === 'yesterday' && (
                <div>
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold gradient-text">Yesterday&apos;s Results</h1>
                        <p className="text-foreground/40 text-sm mt-2">How the markets moved and how you predicted</p>
                    </div>
                    <YesterdayResult />
                </div>
            )}
        </div>
    );
}
