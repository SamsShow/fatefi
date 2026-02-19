'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, Flame, Wallet } from 'lucide-react';
import { getLeaderboard } from '@/lib/api';
import { isConnected } from '@/lib/wallet';

interface LeaderEntry {
    rank: number;
    wallet_address: string;
    username?: string;
    total_points: number;
    accuracy_pct: number;
    current_streak: number;
    longest_streak: number;
    total_predictions: number;
}

function shortenAddr(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getRankLabel(rank: number): string {
    if (rank === 1) return '#1';
    if (rank === 2) return '#2';
    if (rank === 3) return '#3';
    return `#${rank}`;
}

function getRankColor(rank: number): string {
    if (rank === 1) return 'text-accent-gold';
    if (rank === 2) return 'text-foreground/60';
    if (rank === 3) return 'text-accent-gold/60';
    return 'text-foreground/40';
}

export default function LeaderboardPage() {
    const [connected, setConnected] = useState(false);
    const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const syncAuth = () => {
            const hasAuth = isConnected();
            setConnected(hasAuth);
            if (hasAuth) {
                void loadLeaderboard();
            } else {
                setLeaders([]);
                setLoading(false);
            }
        };

        syncAuth();
        window.addEventListener('fatefi-auth-changed', syncAuth);
        return () => window.removeEventListener('fatefi-auth-changed', syncAuth);
    }, []);

    async function loadLeaderboard() {
        try {
            const data = await getLeaderboard();
            setLeaders(data);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <Trophy size={44} className="mx-auto mb-3 text-accent-gold" strokeWidth={1.5} />
                <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Leaderboard</h1>
                <p className="text-foreground/45">Top oracles ranked by total points</p>
            </div>

            {!connected ? (
                <div className="glass-card p-12 text-center">
                    <Wallet size={48} className="mx-auto mb-4 text-foreground/20" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                    <p className="text-foreground/45">Sign in with your wallet to view the leaderboard.</p>
                </div>
            ) : loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass-card p-4 shimmer h-16 rounded-xl" />
                    ))}
                </div>
            ) : leaders.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Users size={48} className="mx-auto mb-4 text-foreground/20" strokeWidth={1.5} />
                    <h3 className="text-xl font-bold mb-2">No Oracles Yet</h3>
                    <p className="text-foreground/45">Be the first to predict and claim the throne!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Top 3 podium */}
                    {leaders.length >= 3 && (
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[leaders[1], leaders[0], leaders[2]].map((entry, i) => {
                                const order = [2, 1, 3][i];
                                const heights = ['h-28', 'h-36', 'h-24'];
                                const topBorder = order === 1 ? 'border-t-2 border-t-accent-gold/40' : '';
                                return (
                                    <div key={entry.rank} className={`glass-card p-4 text-center flex flex-col justify-end ${topBorder} ${heights[i]}`}>
                                        <div className={`text-2xl font-bold mb-1 ${getRankColor(order)}`}>{getRankLabel(order)}</div>
                                        <div className="text-sm font-mono text-accent-purple truncate">
                                            {entry.username || shortenAddr(entry.wallet_address)}
                                        </div>
                                        <div className="text-lg font-bold gradient-text">{entry.total_points.toLocaleString()}</div>
                                        <div className="text-xs text-foreground/40">{entry.accuracy_pct}% accuracy</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full table */}
                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="px-4 py-3 text-left text-xs font-mono text-foreground/35 uppercase tracking-widest">Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-mono text-foreground/35 uppercase tracking-widest">Oracle</th>
                                    <th className="px-4 py-3 text-right text-xs font-mono text-foreground/35 uppercase tracking-widest">Points</th>
                                    <th className="px-4 py-3 text-right text-xs font-mono text-foreground/35 uppercase tracking-widest hidden sm:table-cell">Accuracy</th>
                                    <th className="px-4 py-3 text-right text-xs font-mono text-foreground/35 uppercase tracking-widest hidden md:table-cell">Streak</th>
                                    <th className="px-4 py-3 text-right text-xs font-mono text-foreground/35 uppercase tracking-widest hidden md:table-cell">Predictions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaders.map((entry) => (
                                    <tr key={entry.rank} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`font-bold ${getRankColor(entry.rank)}`}>
                                                {getRankLabel(entry.rank)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-accent-purple">
                                            {entry.username || shortenAddr(entry.wallet_address)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-accent-gold">
                                            {entry.total_points.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-foreground/55 hidden sm:table-cell">
                                            {entry.accuracy_pct}%
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right hidden md:table-cell">
                                            {entry.current_streak > 0 ? (
                                                <span className="flex items-center justify-end gap-1 text-accent-gold">
                                                    <Flame size={13} />
                                                    {entry.current_streak}
                                                </span>
                                            ) : (
                                                <span className="text-foreground/25">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-foreground/40 hidden md:table-cell">
                                            {entry.total_predictions}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
