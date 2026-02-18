'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { History, Wallet, Moon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getMyPredictions } from '@/lib/api';
import { isConnected } from '@/lib/wallet';
import { getCardImagePath } from '@/lib/cardImages';

interface PredictionEntry {
    id: number;
    prediction_type: string;
    selected_option: string;
    result: 'correct' | 'incorrect' | 'pending';
    score: number;
    timestamp: string;
    card_name: string;
    orientation: string;
    draw_date: string;
}

const RESULT_BADGES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    correct: {
        label: 'Correct',
        color: 'text-accent-green bg-accent-green/10 border border-accent-green/20',
        icon: <CheckCircle2 size={11} />,
    },
    incorrect: {
        label: 'Wrong',
        color: 'text-accent-red bg-accent-red/10 border border-accent-red/20',
        icon: <XCircle size={11} />,
    },
    pending: {
        label: 'Pending',
        color: 'text-accent-gold bg-accent-gold/10 border border-accent-gold/20',
        icon: <Clock size={11} />,
    },
};

export default function HistoryPage() {
    const [predictions, setPredictions] = useState<PredictionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [notConnected, setNotConnected] = useState(false);

    useEffect(() => {
        if (!isConnected()) {
            setNotConnected(true);
            setLoading(false);
            return;
        }
        loadPredictions();
    }, []);

    async function loadPredictions() {
        try {
            const data = await getMyPredictions();
            setPredictions(data);
        } catch (err) {
            console.error('Failed to load predictions:', err);
        } finally {
            setLoading(false);
        }
    }

    const totalPredictions = predictions.length;
    const resolved = predictions.filter(p => p.result !== 'pending');
    const correct = resolved.filter(p => p.result === 'correct').length;
    const accuracy = resolved.length > 0 ? ((correct / resolved.length) * 100).toFixed(1) : '0';
    const totalPoints = predictions.reduce((sum, p) => sum + p.score, 0);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <History size={44} className="mx-auto mb-3 text-accent-purple" strokeWidth={1.5} />
                <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Prediction History</h1>
                <p className="text-foreground/45">Your journey through the cosmic markets</p>
            </div>

            {notConnected ? (
                <div className="glass-card p-12 text-center">
                    <Wallet size={48} className="mx-auto mb-4 text-foreground/20" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                    <p className="text-foreground/45">Sign in with your wallet to see your prediction history.</p>
                </div>
            ) : loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass-card p-4 shimmer h-20 rounded-xl" />
                    ))}
                </div>
            ) : predictions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Moon size={48} className="mx-auto mb-4 text-foreground/20" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold mb-2">No Predictions Yet</h3>
                    <p className="text-foreground/45">Draw today&apos;s card and make your first prediction!</p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="glass-card p-4 text-center">
                            <div className="text-2xl font-bold gradient-text">{totalPredictions}</div>
                            <div className="text-xs text-foreground/40 mt-0.5">Total</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-2xl font-bold text-accent-green">{accuracy}%</div>
                            <div className="text-xs text-foreground/40 mt-0.5">Accuracy</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-2xl font-bold text-accent-gold">{totalPoints}</div>
                            <div className="text-xs text-foreground/40 mt-0.5">Points</div>
                        </div>
                    </div>

                    {/* Prediction list */}
                    <div className="space-y-3">
                        {predictions.map((pred) => {
                            const badge = RESULT_BADGES[pred.result];
                            return (
                                <div key={pred.id} className="glass-card p-4 flex items-center gap-4 hover:bg-white/4 transition-colors">
                                    <div className="relative w-10 h-[60px] rounded-md overflow-hidden shadow-card flex-shrink-0">
                                        <Image src={getCardImagePath(pred.card_name)} alt={pred.card_name} fill className="object-cover" sizes="40px" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold truncate">{pred.card_name}</span>
                                            <span className={`text-xs ${pred.orientation === 'upright' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                {pred.orientation === 'upright' ? '△' : '▽'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-foreground/40">
                                            {new Date(pred.draw_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            {' · '}
                                            Predicted <strong className="text-foreground/60">{pred.selected_option.toUpperCase()}</strong>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${badge.color}`}>
                                            {badge.icon}
                                            {badge.label}
                                        </span>
                                        {pred.score > 0 && (
                                            <div className="text-xs text-accent-gold mt-1">+{pred.score} pts</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
