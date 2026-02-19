'use client';

/**
 * ElsaPortfolio — "On-Chain Aura" panel
 *
 * Powered by Elsa x402 API (https://x402.heyelsa.ai)
 * Fetches the connected wallet's portfolio and balances on demand.
 * Costs are paid by the connected visitor wallet via x402 micropayments.
 */

import { useState } from 'react';
import { Wallet, Loader2, ChevronDown, ChevronUp, Sparkles, TrendingUp, Coins } from 'lucide-react';
import { getElsaPortfolioUserPaid, getElsaBalancesUserPaid } from '@/lib/elsaClient';
import { getStoredWallet } from '@/lib/wallet';

interface Balance {
    asset: string;
    balance: string;
    balance_usd: string;
    chain: string;
}

interface PortfolioData {
    total_value_usd: string;
    chains: string[];
    portfolio?: {
        balances?: Balance[];
        defi_positions?: any[];
        staking_positions?: any[];
    };
}

interface BalanceData {
    balances: Balance[];
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export default function ElsaPortfolio() {
    const [open, setOpen] = useState(false);
    const [loadState, setLoadState] = useState<LoadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [balances, setBalances] = useState<Balance[]>([]);

    // Cache — don't re-fetch on collapse/expand
    const alreadyLoaded = loadState === 'loaded';

    async function handleToggle() {
        if (!open && !alreadyLoaded) {
            await loadData();
        }
        setOpen(prev => !prev);
    }

    async function loadData() {
        const wallet = getStoredWallet();
        if (!wallet) {
            setError('No wallet connected');
            setLoadState('error');
            return;
        }

        setLoadState('loading');
        setError(null);

        try {
            // Run both fetches in parallel
            const [portfolioResult, balancesResult] = await Promise.allSettled([
                getElsaPortfolioUserPaid(wallet),
                getElsaBalancesUserPaid(wallet),
            ]);

            if (portfolioResult.status === 'fulfilled') {
                setPortfolio(portfolioResult.value);
            }
            if (balancesResult.status === 'fulfilled') {
                const bd = balancesResult.value as BalanceData;
                setBalances(bd?.balances ?? []);
            }

            if (portfolioResult.status === 'rejected' && balancesResult.status === 'rejected') {
                throw new Error('Both portfolio and balance fetches failed');
            }

            setLoadState('loaded');
        } catch (err: any) {
            console.error('[ElsaPortfolio]', err);
            if (err?.response?.status === 402) {
                setError('Payment required by Elsa x402. Approve in your wallet to continue.');
            } else {
                setError(err.message || 'Failed to load portfolio');
            }
            setLoadState('error');
        }
    }

    const totalUsd = portfolio?.total_value_usd
        ? parseFloat(portfolio.total_value_usd).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        })
        : null;

    const topBalances = balances
        .filter(b => parseFloat(b.balance_usd || '0') > 0)
        .sort((a, b) => parseFloat(b.balance_usd) - parseFloat(a.balance_usd))
        .slice(0, 6);

    const defiPositions = portfolio?.portfolio?.defi_positions ?? [];
    const stakingPositions = portfolio?.portfolio?.staking_positions ?? [];

    return (
        <div className="mt-6">
            {/* ─── Toggle Button ─── */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between gap-3 glass-card px-5 py-4 rounded-2xl
                    hover:bg-white/[0.04] transition-all duration-200 group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(124,106,247,0.15)', border: '1px solid rgba(124,106,247,0.25)' }}
                    >
                        <Sparkles size={15} className="text-accent-purple" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                            On-Chain Aura
                        </div>
                        <div className="text-[11px] text-foreground/35">
                            {alreadyLoaded && totalUsd
                                ? `Portfolio: ${totalUsd}`
                                : 'Powered by Elsa x402 · You pay with your wallet'}
                        </div>
                    </div>
                </div>
                <div className="text-foreground/30">
                    {loadState === 'loading'
                        ? <Loader2 size={16} className="animate-spin text-accent-purple" />
                        : open
                            ? <ChevronUp size={16} />
                            : <ChevronDown size={16} />
                    }
                </div>
            </button>

            {/* ─── Expanded Panel ─── */}
            {open && (
                <div className="mt-2 animate-[fadeIn_0.3s_ease-out]">
                    {loadState === 'loading' && (
                        <div className="glass-card p-6 text-center rounded-2xl">
                            <Loader2 size={28} className="mx-auto mb-3 text-accent-purple animate-spin" />
                            <div className="text-sm text-foreground/50">Reading the blockchain stars...</div>
                        </div>
                    )}

                    {loadState === 'error' && (
                        <div className="glass-card p-5 rounded-2xl"
                            style={{ border: '1px solid rgba(192,69,90,0.2)' }}>
                            <p className="text-sm text-accent-red/80 text-center">{error}</p>
                            <button
                                onClick={loadData}
                                className="mt-3 w-full text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {loadState === 'loaded' && (
                        <div className="glass-card p-5 md:p-6 rounded-2xl space-y-5">
                            {/* Header with total */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-[10px] text-accent-purple font-mono tracking-[0.2em] mb-1 uppercase">
                                        ✦ Cosmic Portfolio
                                    </div>
                                    {totalUsd && (
                                        <div className="text-2xl font-bold gradient-text">{totalUsd}</div>
                                    )}
                                    {portfolio?.chains && portfolio.chains.length > 0 && (
                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                            {portfolio.chains.map(chain => (
                                                <span key={chain}
                                                    className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                                                    style={{ background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.2)' }}
                                                >
                                                    {chain}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Wallet size={20} className="text-foreground/20 mt-1" />
                            </div>

                            {/* Token Balances */}
                            {topBalances.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Coins size={12} className="text-accent-gold" />
                                        <span className="text-[10px] text-accent-gold font-mono tracking-[0.2em] uppercase">Token Balances</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {topBalances.map((b, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                            >
                                                <div>
                                                    <div className="text-xs font-semibold text-foreground/80">{b.asset}</div>
                                                    <div className="text-[10px] text-foreground/35 font-mono">{b.chain}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono text-foreground/70">
                                                        {parseFloat(b.balance).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                                    </div>
                                                    <div className="text-[10px] text-accent-green font-mono">
                                                        ${parseFloat(b.balance_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DeFi Positions */}
                            {defiPositions.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp size={12} className="text-accent-purple" />
                                        <span className="text-[10px] text-accent-purple font-mono tracking-[0.2em] uppercase">DeFi Positions</span>
                                    </div>
                                    <div className="space-y-2">
                                        {defiPositions.slice(0, 4).map((pos: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                                style={{ background: 'rgba(124,106,247,0.04)', border: '1px solid rgba(124,106,247,0.08)' }}
                                            >
                                                <div>
                                                    <div className="text-xs font-medium text-foreground/75">{pos.protocol || pos.name}</div>
                                                    <div className="text-[10px] text-foreground/35">{pos.type || pos.position_type}</div>
                                                </div>
                                                {(pos.value_usd || pos.balance_usd) && (
                                                    <div className="text-xs font-mono text-accent-gold">
                                                        ${parseFloat(pos.value_usd || pos.balance_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Staking Positions */}
                            {stakingPositions.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles size={12} className="text-accent-green" />
                                        <span className="text-[10px] text-accent-green font-mono tracking-[0.2em] uppercase">Staking</span>
                                    </div>
                                    <div className="space-y-2">
                                        {stakingPositions.slice(0, 3).map((pos: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                                style={{ background: 'rgba(76,175,130,0.04)', border: '1px solid rgba(76,175,130,0.08)' }}
                                            >
                                                <div>
                                                    <div className="text-xs font-medium text-foreground/75">{pos.protocol}</div>
                                                    <div className="text-[10px] text-accent-green/70">APY {pos.apy}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono text-foreground/60">{pos.staked_amount} {pos.token}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {topBalances.length === 0 && defiPositions.length === 0 && (
                                <div className="text-center text-sm text-foreground/30 py-2">
                                    The cosmic ledger shows an empty treasury. Stack some ETH to unleash your on-chain fate.
                                </div>
                            )}

                            {/* Elsa attribution */}
                            <div className="pt-1 border-t border-white/[0.04] flex items-center justify-between">
                                <span className="text-[10px] text-foreground/20">Powered by Elsa x402</span>
                                <button
                                    onClick={loadData}
                                    className="text-[10px] text-foreground/25 hover:text-accent-purple transition-colors"
                                >
                                    Refresh ↻
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
