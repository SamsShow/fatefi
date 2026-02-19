'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, CheckCircle2, Lock, Loader2, Coins, ExternalLink } from 'lucide-react';
import { submitPrediction } from '@/lib/api';
import { isConnected } from '@/lib/wallet';
import { stakeOnOption, STAKE_AMOUNT_ETH, getPoolContractAddress, getSelectedNetwork, getExplorerBaseUrl, type UserNetwork } from '@/lib/staking';

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

type StakeStep = 'idle' | 'staking' | 'confirming' | 'submitting' | 'done';

export default function PredictionForm({ onSubmitted }: PredictionFormProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [step, setStep] = useState<StakeStep>('idle');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [network, setNetwork] = useState<UserNetwork>('mainnet');

    useEffect(() => {
        const syncNetwork = () => setNetwork(getSelectedNetwork());
        syncNetwork();
        window.addEventListener('fatefi-network-changed', syncNetwork);
        return () => window.removeEventListener('fatefi-network-changed', syncNetwork);
    }, []);

    const poolEnabled = !!getPoolContractAddress(network);

    const handleSubmit = async () => {
        if (!selected) return;
        if (!isConnected()) {
            setError('Connect your wallet first!');
            return;
        }

        try {
            setError(null);

            if (poolEnabled) {
                // Step 1: On-chain stake
                setStep('staking');
                const hash = await stakeOnOption(selected);
                setTxHash(hash);

                // Step 2: Confirm on-chain
                setStep('confirming');
                // tx.wait() already called inside stakeOnOption
            }

            // Step 3: Submit prediction to backend
            setStep('submitting');
            const predType = selected === 'high' ? 'volatility' : 'direction';
            const result = await submitPrediction(predType, selected);

            setStep('done');
            onSubmitted?.(result);
        } catch (err: any) {
            setError(err.message || 'Transaction failed');
            setStep('idle');
        }
    };

    if (step === 'done') {
        return (
            <div className="glass-card p-6 text-center">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-accent-green" />
                <h3 className="text-lg font-bold text-accent-gold mb-1">
                    {poolEnabled ? 'Stake & Prediction Locked!' : 'Prediction Locked In!'}
                </h3>
                <p className="text-sm text-foreground/55 mb-3">
                    {poolEnabled
                        ? `You staked ${STAKE_AMOUNT_ETH} ETH on your prediction. Winners split the pool at 12:01 AM IST.`
                        : 'The stars have recorded your choice. May fate favor the bold.'}
                </p>
                {txHash && (
                    <a
                        href={`${getExplorerBaseUrl(network)}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-accent-purple hover:underline"
                    >
                        <ExternalLink size={12} />
                        View on Basescan
                    </a>
                )}
            </div>
        );
    }

    const isProcessing = step !== 'idle';

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold">Cast Your Prediction</h3>
                {poolEnabled && (
                    <span className="flex items-center gap-1 text-xs text-accent-gold font-mono">
                        <Coins size={12} />
                        {STAKE_AMOUNT_ETH} ETH stake
                    </span>
                )}
            </div>
            <p className="text-sm text-foreground/45 mb-5">
                {poolEnabled
                    ? 'Stake ETH on where the market is heading. Winners split the pool!'
                    : 'What do the cards tell you about today\u0027s market?'}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
                {OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => !isProcessing && setSelected(opt.value)}
                        disabled={isProcessing}
                        className={`relative p-4 rounded-xl border transition-all duration-200 text-center
              ${selected === opt.value
                                ? `${opt.activeClass} border-opacity-100 scale-[1.02]`
                                : 'border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/6'
                            }
              ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
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

            {/* Progress indicator */}
            {isProcessing && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-accent-purple/8 border border-accent-purple/15">
                    <div className="flex items-center gap-2 text-sm text-accent-purple">
                        <Loader2 size={14} className="animate-spin" />
                        {step === 'staking' && 'Confirm in your wallet...'}
                        {step === 'confirming' && 'Waiting for confirmation...'}
                        {step === 'submitting' && 'Recording prediction...'}
                    </div>
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!selected || isProcessing}
                className="w-full py-3 rounded-xl bg-accent-purple text-white font-semibold flex items-center justify-center gap-2
                   hover:bg-accent-purple/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Lock size={14} />
                )}
                {isProcessing
                    ? 'Processing...'
                    : poolEnabled
                        ? `Stake ${STAKE_AMOUNT_ETH} ETH & Lock In`
                        : 'Lock In Prediction'}
            </button>
        </div>
    );
}
