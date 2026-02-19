'use client';

import { useEffect, useState } from 'react';
import { Moon, AlertCircle, Lock, MousePointerClick, Loader2, CalendarDays, Wallet } from 'lucide-react';
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
        market_mood?: string | null;
        key_levels?: string | null;
        cosmic_tip?: string | null;
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

                            {/* AI Interpretation — Mystical Oracle Card */}
                            {revealed && draw.ai_interpretation && (
                                <div className="relative mb-8 animate-[fadeIn_0.6s_ease-out]">
                                    {/* Animated gradient border wrapper */}
                                    <div className="absolute -inset-[1px] rounded-2xl oracle-border-glow opacity-60" />

                                    <div className="relative rounded-2xl overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(165deg, rgba(20,24,48,0.95) 0%, rgba(12,15,26,0.98) 50%, rgba(22,18,40,0.95) 100%)',
                                        }}
                                    >
                                        {/* Sparkle decorations */}
                                        <div className="absolute top-4 right-6 text-accent-gold/30 text-lg animate-[twinkle_2s_ease-in-out_infinite]">✦</div>
                                        <div className="absolute top-12 right-14 text-accent-purple/20 text-sm animate-[twinkle_3s_ease-in-out_infinite_0.5s]">✧</div>
                                        <div className="absolute bottom-16 left-6 text-accent-gold/20 text-sm animate-[twinkle_2.5s_ease-in-out_infinite_1s]">✦</div>

                                        {/* Header */}
                                        <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center oracle-icon-glow">
                                                <span className="text-xl">🔮</span>
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold gradient-text">Oracle&apos;s Vision</h2>
                                                <p className="text-xs text-foreground/35 tracking-wide">The cosmos has spoken</p>
                                            </div>
                                            <div className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide oracle-tone-badge">
                                                {draw.ai_interpretation.confidence_tone}
                                            </div>
                                        </div>

                                        {/* Divider with star */}
                                        <div className="flex items-center gap-3 px-6 md:px-8">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent-purple/25 to-transparent" />
                                            <span className="text-accent-gold/40 text-[10px]">☽ ✦ ☾</span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent-purple/25 to-transparent" />
                                        </div>

                                        {/* Prediction — Hero Section */}
                                        <div className="px-6 md:px-8 py-5">
                                            <div className="relative pl-4 border-l-2 border-accent-gold/30">
                                                <div className="text-[10px] text-accent-gold font-mono tracking-[0.2em] mb-2 uppercase">⚡ Prediction</div>
                                                <p className="text-foreground/90 text-base md:text-lg leading-relaxed font-medium">
                                                    {draw.ai_interpretation.prediction}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Narrative — Mystic Quote */}
                                        <div className="mx-6 md:mx-8 mb-5 p-4 md:p-5 rounded-xl"
                                            style={{ background: 'rgba(124,106,247,0.04)', border: '1px solid rgba(124,106,247,0.08)' }}
                                        >
                                            <div className="text-[10px] text-accent-purple font-mono tracking-[0.2em] mb-2 uppercase">🌙 Narrative</div>
                                            <p className="text-foreground/55 leading-relaxed italic font-serif text-[15px]">
                                                &ldquo;{draw.ai_interpretation.narrative}&rdquo;
                                            </p>
                                        </div>

                                        {/* Market Mood + Key Levels — Side by Side */}
                                        {(draw.ai_interpretation.market_mood || draw.ai_interpretation.key_levels) && (
                                            <div className="mx-6 md:mx-8 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {draw.ai_interpretation.market_mood && (
                                                    <div className="p-3.5 rounded-xl" style={{ background: 'rgba(76,175,130,0.05)', border: '1px solid rgba(76,175,130,0.1)' }}>
                                                        <div className="text-[10px] text-accent-green font-mono tracking-[0.2em] mb-1.5 uppercase">📊 Market Mood</div>
                                                        <p className="text-foreground/65 text-sm leading-relaxed">{draw.ai_interpretation.market_mood}</p>
                                                    </div>
                                                )}
                                                {draw.ai_interpretation.key_levels && (
                                                    <div className="p-3.5 rounded-xl" style={{ background: 'rgba(192,69,90,0.05)', border: '1px solid rgba(192,69,90,0.1)' }}>
                                                        <div className="text-[10px] text-accent-red font-mono tracking-[0.2em] mb-1.5 uppercase">🎯 Key Levels</div>
                                                        <p className="text-foreground/65 text-sm leading-relaxed">{draw.ai_interpretation.key_levels}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Cosmic Tip — Golden Callout */}
                                        {draw.ai_interpretation.cosmic_tip && (
                                            <div className="mx-6 md:mx-8 mb-5 p-4 rounded-xl flex items-start gap-3"
                                                style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)', border: '1px solid rgba(201,168,76,0.15)' }}
                                            >
                                                <span className="text-lg shrink-0 mt-0.5">💡</span>
                                                <div>
                                                    <div className="text-[10px] text-accent-gold font-mono tracking-[0.2em] mb-1 uppercase">Cosmic Tip</div>
                                                    <p className="text-foreground/75 text-sm leading-relaxed font-medium">{draw.ai_interpretation.cosmic_tip}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Disclaimer — Playful */}
                                        <div className="mx-6 md:mx-8 mb-6 flex items-start gap-2 px-3 py-2.5 rounded-lg"
                                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                                        >
                                            <span className="text-sm shrink-0 mt-px">🃏</span>
                                            <p className="text-[11px] text-foreground/30 leading-relaxed">
                                                {draw.ai_interpretation.disclaimer}
                                            </p>
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
