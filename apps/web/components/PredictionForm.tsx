'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, CheckCircle2, Lock } from 'lucide-react';
import { submitPrediction } from '@/lib/api';
import { isConnected } from '@/lib/wallet';

interface PredictionFormProps {
    onSubmitted?: (prediction: any) => void;
}

const OPTIONS = [
    {
        value: 'bullish',
        label: 'Bullish',
        icon: <TrendingUp size={24} className="text-accent-green" />,
        description: 'Markets going up',
        activeClass: 'border-accent-green/50 bg-accent-green/8',
    },
    {
        value: 'bearish',
        label: 'Bearish',
        icon: <TrendingDown size={24} className="text-accent-red" />,
        description: 'Markets going down',
        activeClass: 'border-accent-red/50 bg-accent-red/8',
    },
    {
        value: 'high',
        label: 'Volatile',
        icon: <Activity size={24} className="text-accent-gold" />,
        description: 'Wild swings expected',
        activeClass: 'border-accent-gold/50 bg-accent-gold/8',
    },
];

export default function PredictionForm({ onSubmitted }: PredictionFormProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selected) return;
        if (!isConnected()) {
            setError('Connect your wallet first!');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const predType = selected === 'high' ? 'volatility' : 'direction';
            const result = await submitPrediction(predType, selected);
            setSubmitted(true);
            onSubmitted?.(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="glass-card p-6 text-center">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-accent-green" />
                <h3 className="text-lg font-bold text-accent-gold mb-1">Prediction Locked In!</h3>
                <p className="text-sm text-foreground/55">The stars have recorded your choice. May fate favor the bold.</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-1">Cast Your Prediction</h3>
            <p className="text-sm text-foreground/45 mb-5">What do the cards tell you about today&apos;s market?</p>

            <div className="grid grid-cols-3 gap-3 mb-5">
                {OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setSelected(opt.value)}
                        className={`relative p-4 rounded-xl border transition-all duration-200 text-center
              ${selected === opt.value
                                ? `${opt.activeClass} border-opacity-100 scale-[1.02]`
                                : 'border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/6'
                            }`}
                    >
                        <div className="mb-2 flex justify-center">{opt.icon}</div>
                        <div className="text-sm font-bold">{opt.label}</div>
                        <div className="text-xs text-foreground/40 mt-0.5">{opt.description}</div>
                        {selected === opt.value && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="text-accent-red text-sm mb-3 bg-accent-red/8 border border-accent-red/15 px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="w-full py-3 rounded-xl bg-accent-purple text-white font-semibold flex items-center justify-center gap-2
                   hover:bg-accent-purple/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <Lock size={14} />
                {submitting ? 'Submitting...' : 'Lock In Prediction'}
            </button>
        </div>
    );
}
