'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getEthPrice } from '@/lib/api';

interface PriceData {
    current_price: number | null;
    today: {
        date: string;
        open_price: number;
        high_price: number;
        low_price: number;
        latest_price: number;
        change_pct: string | null;
    } | null;
}

export default function EthPriceTicker() {
    const [data, setData] = useState<PriceData | null>(null);

    useEffect(() => {
        loadPrice();
        const interval = setInterval(loadPrice, 30_000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    async function loadPrice() {
        try {
            const result = await getEthPrice();
            setData(result);
        } catch {
            // silently fail
        }
    }

    if (!data || !data.current_price) return null;

    const changePct = data.today?.change_pct ? parseFloat(data.today.change_pct) : 0;
    const isUp = changePct >= 0;

    return (
        <div className="glass-card px-4 py-3 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-purple/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent-purple">Ξ</span>
                </div>
                <div>
                    <span className="font-bold text-foreground">ETH/USD</span>
                    <span className="text-foreground/35 text-xs ml-2">Base</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-lg">
                    ${data.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {data.today && (
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border
                        ${isUp
                            ? 'text-accent-green bg-accent-green/10 border-accent-green/20'
                            : 'text-accent-red bg-accent-red/10 border-accent-red/20'}`}
                    >
                        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isUp ? '+' : ''}{changePct}%
                    </span>
                )}
            </div>

            {data.today && (
                <div className="hidden sm:flex items-center gap-4 text-xs text-foreground/40">
                    <div>
                        <span className="text-foreground/25 mr-1">O</span>
                        ${data.today.open_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div>
                        <span className="text-foreground/25 mr-1">H</span>
                        ${data.today.high_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div>
                        <span className="text-foreground/25 mr-1">L</span>
                        ${data.today.low_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            )}
        </div>
    );
}
