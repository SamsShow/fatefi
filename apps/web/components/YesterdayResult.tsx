'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { getYesterdayResult, getMyPredictions } from '@/lib/api';
import { isConnected } from '@/lib/wallet';
import { getCardImagePath } from '@/lib/cardImages';

interface YesterdayData {
    date: string;
    open_price: number;
    close_price: number;
    high_price: number;
    low_price: number;
    change_pct: string | null;
    resolved: boolean;
    outcome: string | null;
}

interface PredictionEntry {
    id: number;
    selected_option: string;
    result: 'correct' | 'incorrect' | 'pending';
    score: number;
    card_name: string;
    orientation: string;
    draw_date: string;
}

const OUTCOME_DISPLAY: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    bullish: { label: 'Bullish', icon: <TrendingUp size={16} />, color: 'text-accent-green' },
    bearish: { label: 'Bearish', icon: <TrendingDown size={16} />, color: 'text-accent-red' },
    high: { label: 'Volatile', icon: <Activity size={16} />, color: 'text-accent-gold' },
};

export default function YesterdayResult() {
    const [market, setMarket] = useState<YesterdayData | null>(null);
    const [prediction, setPrediction] = useState<PredictionEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const marketData = await getYesterdayResult();
            setMarket(marketData);

            if (isConnected() && marketData) {
                try {
                    const preds = await getMyPredictions();
                    // Find user's prediction for yesterday's date
                    const yesterdayPred = preds.find((p: PredictionEntry) => p.draw_date === marketData.date);
                    if (yesterdayPred) setPrediction(yesterdayPred);
                } catch {
                    // Not logged in
                }
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="text-accent-purple animate-spin" />
            </div>
        );
    }

    if (!market) {
        return (
            <div className="glass-card p-8 text-center">
                <Clock size={36} className="mx-auto mb-3 text-foreground/25" />
                <h3 className="text-lg font-bold mb-1">No Yesterday Data</h3>
                <p className="text-foreground/45 text-sm">Price tracking just started. Check back tomorrow!</p>
            </div>
        );
    }

    const changePct = market.change_pct ? parseFloat(market.change_pct) : 0;
    const isUp = changePct >= 0;
    const outcomeInfo = market.outcome ? OUTCOME_DISPLAY[market.outcome] : null;

    return (
        <div className="space-y-5">
            {/* Market Summary */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-xs text-foreground/35 font-mono tracking-wider mb-1">
                            {new Date(market.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <h3 className="text-lg font-bold">ETH/USD Market Summary</h3>
                    </div>
                    {outcomeInfo && (
                        <div className={`flex items-center gap-1.5 text-sm font-bold ${outcomeInfo.color}`}>
                            {outcomeInfo.icon}
                            {outcomeInfo.label}
                        </div>
                    )}
                </div>

                {/* Price Bar */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                        <div className="text-xs text-foreground/30 mb-1">Open</div>
                        <div className="font-mono font-bold">${market.open_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="flex-1 relative h-10">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-1 bg-white/8 rounded-full relative overflow-hidden">
                                <div
                                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${isUp ? 'bg-accent-green/60' : 'bg-accent-red/60'}`}
                                    style={{ width: `${Math.min(Math.abs(changePct) * 10, 100)}%` }}
                                />
                            </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
                                {isUp ? '+' : ''}{changePct}%
                            </span>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-foreground/30 mb-1">Close</div>
                        <div className="font-mono font-bold">${market.close_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                </div>

                {/* OHLC row */}
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                    <div className="bg-white/4 rounded-lg px-2 py-2">
                        <div className="text-foreground/25 mb-0.5">Open</div>
                        <div className="font-mono">${market.open_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-white/4 rounded-lg px-2 py-2">
                        <div className="text-foreground/25 mb-0.5">High</div>
                        <div className="font-mono text-accent-green">${market.high_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-white/4 rounded-lg px-2 py-2">
                        <div className="text-foreground/25 mb-0.5">Low</div>
                        <div className="font-mono text-accent-red">${market.low_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-white/4 rounded-lg px-2 py-2">
                        <div className="text-foreground/25 mb-0.5">Close</div>
                        <div className="font-mono">${market.close_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
            </div>

            {/* User's Prediction Result */}
            {prediction ? (
                <div className="glass-card p-6">
                    <h4 className="text-sm font-bold mb-3 text-foreground/60">Your Prediction</h4>
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-[72px] rounded-md overflow-hidden shadow-card flex-shrink-0">
                            <Image src={getCardImagePath(prediction.card_name)} alt={prediction.card_name} fill className="object-cover" sizes="48px" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold mb-0.5">{prediction.card_name}</div>
                            <div className="text-xs text-foreground/40">
                                You predicted <strong className="text-foreground/60">{prediction.selected_option.toUpperCase()}</strong>
                            </div>
                        </div>
                        <div className="text-right">
                            {prediction.result === 'correct' ? (
                                <div className="flex items-center gap-1.5 text-accent-green">
                                    <CheckCircle2 size={18} />
                                    <span className="font-bold">Correct!</span>
                                </div>
                            ) : prediction.result === 'incorrect' ? (
                                <div className="flex items-center gap-1.5 text-accent-red">
                                    <XCircle size={18} />
                                    <span className="font-bold">Wrong</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-accent-gold">
                                    <Clock size={18} />
                                    <span className="font-bold">Pending</span>
                                </div>
                            )}
                            {prediction.score > 0 && (
                                <div className="text-xs text-accent-gold mt-1">+{prediction.score} pts</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : isConnected() ? (
                <div className="glass-card p-6 text-center text-foreground/40 text-sm">
                    You didn&apos;t make a prediction yesterday.
                </div>
            ) : null}

            {!market.resolved && (
                <div className="text-center text-xs text-foreground/30 bg-white/4 px-4 py-2 rounded-lg">
                    <Clock size={12} className="inline mr-1" />
                    Day not yet resolved. Results will be finalized at 12:01 AM IST.
                </div>
            )}
        </div>
    );
}
