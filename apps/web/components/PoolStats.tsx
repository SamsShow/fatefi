'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Coins, RefreshCw } from 'lucide-react';
import { getPoolStats } from '@/lib/api';

interface PoolData {
    dayId: number;
    totalStaked: string;
    stakeAmount: string;
    options: {
        bullish: { total: string; count: number };
        bearish: { total: string; count: number };
        volatile: { total: string; count: number };
    };
    resolved: boolean;
}

const OPTION_CONFIG = [
    { key: 'bullish' as const, label: 'Bullish', icon: <TrendingUp size={14} />, color: 'text-accent-green', barColor: 'bg-accent-green' },
    { key: 'bearish' as const, label: 'Bearish', icon: <TrendingDown size={14} />, color: 'text-accent-red', barColor: 'bg-accent-red' },
    { key: 'volatile' as const, label: 'Volatile', icon: <Activity size={14} />, color: 'text-accent-gold', barColor: 'bg-accent-gold' },
];

export default function PoolStats() {
    const [pool, setPool] = useState<PoolData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await getPoolStats();
            setPool(data);
        } catch {
            // Pool not available
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 30_000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;
    if (!pool) return null;

    const totalCount = OPTION_CONFIG.reduce(
        (sum, opt) => sum + pool.options[opt.key].count, 0
    );

    return (
        <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Coins size={16} className="text-accent-gold" />
                    <h3 className="text-sm font-bold">Today&apos;s Pool</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground/40">{totalCount} stakers</span>
                    <button onClick={load} className="text-foreground/30 hover:text-foreground/60 transition-colors">
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            <div className="text-center mb-4">
                <div className="text-2xl font-bold gradient-text">{parseFloat(pool.totalStaked).toFixed(4)} ETH</div>
                <div className="text-xs text-foreground/35">total pool</div>
            </div>

            {/* Pool distribution bars */}
            <div className="space-y-2.5">
                {OPTION_CONFIG.map((opt) => {
                    const count = pool.options[opt.key].count;
                    const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;

                    return (
                        <div key={opt.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className={`flex items-center gap-1 font-medium ${opt.color}`}>
                                    {opt.icon}
                                    {opt.label}
                                </span>
                                <span className="text-foreground/40">
                                    {count} ({pct.toFixed(0)}%)
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${opt.barColor} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.max(pct, 1)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
