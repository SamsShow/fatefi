'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Bot, User, AlertTriangle, RefreshCw, Coins, ExternalLink,
    ArrowRightLeft, MessageSquare, Loader2, CheckCircle, XCircle, Wallet,
} from 'lucide-react';
import { bankrChat, bankrSwap, bankrAgentInfo } from '@/lib/api';
import { getWalletClient } from '@wagmi/core';
import { wagmiConfig } from '@/lib/reown';

const FATEFI_TOKEN_CA = '0x0F2256F7DA1f858c30CbFb9530a023fa4210E6D2';
const FATEFI_FLAUNCH_URL = `https://flaunch.gg/base/coin/${FATEFI_TOKEN_CA}`;
const BASESCAN_TX = 'https://basescan.org/tx/';

// ─── Types ──────────────────────────────────────────────

type TabType = 'chat' | 'swap';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'error';
    content: string;
    timestamp: Date;
}

interface PendingTx {
    type: string;
    to: string;
    data: string;
    value: string;
    gas: string;
    chainId: number;
    description?: string;
}

// ─── Helpers ────────────────────────────────────────────

/** Extract sendable tx params from a Bankr transaction object */
function extractTx(tx: any): PendingTx | null {
    const meta = tx?.metadata;
    if (!meta) return null;

    // Some txs nest under metadata.transaction, others are flat
    const inner = meta.transaction || meta;
    const to = inner.to;
    const data = inner.data;
    if (!to) return null;

    return {
        type: tx.type || 'unknown',
        to,
        data: data || '0x',
        value: inner.value || '0',
        gas: inner.gas || '200000',
        chainId: inner.chainId || meta.chainId || 8453,
        description: meta.__ORIGINAL_TX_DATA__?.humanReadableMessage || meta.description || tx.type,
    };
}

// ─── Component ──────────────────────────────────────────

export default function BankrChat() {
    const [tab, setTab] = useState<TabType>('chat');

    // ─── Chat state ─────────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hey! I\'m Bankr — your AI crypto agent. Ask me about token prices, DeFi strategies, market trends, or execute on-chain actions. Powered by Bankr Agent API 🤖',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ─── Swap state ─────────────────────────────────
    const [swapPrompt, setSwapPrompt] = useState('');
    const [swapLoading, setSwapLoading] = useState(false);
    const [swapResult, setSwapResult] = useState<{
        status: string;
        response: string;
        jobId: string;
    } | null>(null);
    const [pendingTxs, setPendingTxs] = useState<PendingTx[]>([]);
    const [txExecuting, setTxExecuting] = useState(false);
    const [txHashes, setTxHashes] = useState<string[]>([]);
    const [txError, setTxError] = useState<string | null>(null);
    const [agentInfo, setAgentInfo] = useState<any>(null);
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentError, setAgentError] = useState(false);

    // Auto-scroll on new chat messages
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // Fetch agent info when swap tab opens
    useEffect(() => {
        if (tab === 'swap' && !agentInfo && !agentLoading && !agentError) {
            setAgentLoading(true);
            bankrAgentInfo()
                .then(setAgentInfo)
                .catch(() => { setAgentInfo(null); setAgentError(true); })
                .finally(() => setAgentLoading(false));
        }
    }, [tab, agentInfo, agentLoading, agentError]);

    // ─── Chat logic ─────────────────────────────────

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { response } = await bankrChat(text);

            setMessages((prev) => [
                ...prev,
                { id: `bot-${Date.now()}`, role: 'assistant', content: response, timestamp: new Date() },
            ]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                { id: `err-${Date.now()}`, role: 'error', content: err.message || 'Something went wrong.', timestamp: new Date() },
            ]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }, [input, loading]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (tab === 'chat') sendMessage();
            else handleSwap();
        }
    };

    // ─── Swap logic ─────────────────────────────────

    const handleSwap = useCallback(async () => {
        const text = swapPrompt.trim();
        if (!text || swapLoading) return;

        setSwapLoading(true);
        setSwapResult(null);
        setPendingTxs([]);
        setTxHashes([]);
        setTxError(null);

        try {
            const result = await bankrSwap(text);
            setSwapResult({ status: result.status, response: result.response, jobId: result.jobId });

            // Extract executable transactions
            if (result.status === 'completed' && result.transactions?.length > 0) {
                const txs = result.transactions.map(extractTx).filter(Boolean) as PendingTx[];
                if (txs.length > 0) {
                    setPendingTxs(txs);
                }
            }
        } catch (err: any) {
            setSwapResult({
                status: 'failed',
                response: err.message || 'Swap failed.',
                jobId: '',
            });
        } finally {
            setSwapLoading(false);
        }
    }, [swapPrompt, swapLoading]);

    // ─── Execute transactions via user wallet ───────

    const executeTxs = useCallback(async () => {
        if (pendingTxs.length === 0 || txExecuting) return;

        setTxExecuting(true);
        setTxError(null);
        const hashes: string[] = [];

        try {
            const walletClient = await getWalletClient(wagmiConfig);
            if (!walletClient?.account) {
                throw new Error('Please connect your wallet first.');
            }

            for (const tx of pendingTxs) {
                const hash = await walletClient.sendTransaction({
                    to: tx.to as `0x${string}`,
                    data: (tx.data || '0x') as `0x${string}`,
                    value: BigInt(tx.value || '0'),
                    gas: BigInt(tx.gas || '200000'),
                });
                hashes.push(hash);
            }

            setTxHashes(hashes);
            setPendingTxs([]);
        } catch (err: any) {
            const msg = err?.shortMessage || err?.message || 'Transaction rejected.';
            setTxError(msg);
        } finally {
            setTxExecuting(false);
        }
    }, [pendingTxs, txExecuting]);

    // ─── Reset swap ─────────────────────────────────

    const resetSwap = () => {
        setSwapResult(null);
        setPendingTxs([]);
        setTxHashes([]);
        setTxError(null);
        setSwapPrompt('');
    };

    // ─── Quick actions ──────────────────────────────

    const chatQuickActions = [
        'Tell me about the FATEFI token',
        'What are the top DeFi strategies on Base?',
        'Explain staking in simple terms',
    ];

    const swapQuickActions = [
        `Buy $5 of FATEFI (${FATEFI_TOKEN_CA}) on Base`,
        'Swap 0.001 ETH for USDC on Base',
        'What is my ETH balance on Base?',
    ];

    return (
        <div className="bankr-terminal flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto">
            {/* Header with tabs */}
            <div className="glass-card p-3 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
                            <Bot size={20} className="text-accent-purple" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground/90">Bankr Bot</h3>
                            <p className="text-xs text-foreground/45">
                                {tab === 'chat' ? 'Powered by Bankr Agent' : 'Swaps via your wallet'}
                            </p>
                        </div>
                    </div>
                    <a
                        href={FATEFI_FLAUNCH_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 hover:bg-accent-gold/15 transition-colors"
                    >
                        <Coins size={12} className="text-accent-gold" />
                        <span className="text-xs font-medium text-accent-gold">FATEFI</span>
                        <ExternalLink size={10} className="text-accent-gold/60" />
                    </a>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
                    <button
                        onClick={() => setTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'chat'
                            ? 'bg-accent-purple text-white shadow-card'
                            : 'text-foreground/55 hover:text-foreground hover:bg-white/5'
                            }`}
                    >
                        <MessageSquare size={14} />
                        Chat
                    </button>
                    <button
                        onClick={() => setTab('swap')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'swap'
                            ? 'bg-accent-purple text-white shadow-card'
                            : 'text-foreground/55 hover:text-foreground hover:bg-white/5'
                            }`}
                    >
                        <ArrowRightLeft size={14} />
                        Swap
                    </button>
                </div>
            </div>

            {/* ─── Chat Tab ─────────────────────────────── */}
            {tab === 'chat' && (
                <>
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto space-y-4 pr-2 bankr-scroll"
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${msg.role === 'user'
                                        ? 'bg-accent-gold/20'
                                        : msg.role === 'error'
                                            ? 'bg-accent-red/20'
                                            : 'bg-accent-purple/20'
                                        }`}
                                >
                                    {msg.role === 'user' ? (
                                        <User size={14} className="text-accent-gold" />
                                    ) : msg.role === 'error' ? (
                                        <AlertTriangle size={14} className="text-accent-red" />
                                    ) : (
                                        <Bot size={14} className="text-accent-purple" />
                                    )}
                                </div>
                                <div
                                    className={`bankr-bubble max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-accent-purple/15 border border-accent-purple/20 text-foreground/90'
                                        : msg.role === 'error'
                                            ? 'bg-accent-red/10 border border-accent-red/20 text-accent-red'
                                            : 'glass-card text-foreground/80'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <span className="block mt-1.5 text-[10px] text-foreground/30">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-accent-purple/20">
                                    <Bot size={14} className="text-accent-purple" />
                                </div>
                                <div className="glass-card px-4 py-3 rounded-2xl">
                                    <div className="bankr-typing flex gap-1.5">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {messages.length <= 1 && !loading && (
                        <div className="flex flex-wrap gap-2 mt-4 mb-2">
                            {chatQuickActions.map((action) => (
                                <button
                                    key={action}
                                    onClick={() => { setInput(action); setTimeout(() => inputRef.current?.focus(), 0); }}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 text-foreground/60
                                               hover:border-accent-purple/30 hover:text-accent-purple hover:bg-accent-purple/5 transition-all duration-200"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 glass-card p-3 flex items-center gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Bankr anything about crypto..."
                            disabled={loading}
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30
                                       outline-none border-none disabled:opacity-50"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="shrink-0 w-9 h-9 rounded-xl bg-accent-purple flex items-center justify-center
                                       hover:bg-accent-purple/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {loading ? <RefreshCw size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
                        </button>
                    </div>
                </>
            )}

            {/* ─── Swap Tab ─────────────────────────────── */}
            {tab === 'swap' && (
                <div className="flex-1 flex flex-col">
                    {/* Agent Status */}
                    <div className="glass-card p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground/60">Bankr Agent Status</span>
                            {agentLoading ? (
                                <span className="text-xs text-foreground/40 flex items-center gap-1">
                                    <Loader2 size={12} className="animate-spin" /> Checking...
                                </span>
                            ) : agentInfo ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-accent-green flex items-center gap-1">
                                        <CheckCircle size={12} /> Connected
                                    </span>
                                    {agentInfo?.evmAddress && (
                                        <span
                                            className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(agentInfo.evmAddress);
                                                alert('Agent wallet copied!');
                                            }}
                                            title="Click to copy Agent Wallet"
                                        >
                                            {agentInfo.evmAddress.slice(0, 6)}...{agentInfo.evmAddress.slice(-4)}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-xs text-accent-red flex items-center gap-1">
                                    <XCircle size={12} /> Not configured
                                </span>
                            )}
                        </div>
                        {!agentInfo && !agentLoading && (
                            <p className="text-[11px] text-foreground/35 mt-2">
                                Add <code className="text-accent-purple/80 bg-accent-purple/10 px-1 rounded">BANKR_API_KEY</code> to your API .env to enable on-chain swaps. Get one at{' '}
                                <a href="https://bankr.bot/api" target="_blank" rel="noopener noreferrer" className="text-accent-purple underline">bankr.bot/api</a>
                            </p>
                        )}
                    </div>

                    {/* Swap Input — only show when no pending result */}
                    {!swapResult && !pendingTxs.length && !txHashes.length && (
                        <div className="glass-card p-6 mb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowRightLeft size={16} className="text-accent-purple" />
                                <h3 className="text-sm font-bold text-foreground/85">On-Chain Swap</h3>
                            </div>
                            <p className="text-xs text-foreground/45 mb-4">
                                Describe your swap in plain English. Bankr plans the route — <strong>your wallet</strong> executes it.
                            </p>

                            <textarea
                                value={swapPrompt}
                                onChange={(e) => setSwapPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSwap();
                                    }
                                }}
                                placeholder="e.g. Swap 0.01 ETH for USDC on Base"
                                disabled={swapLoading}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground
                                           placeholder:text-foreground/30 outline-none focus:border-accent-purple/40
                                           resize-none disabled:opacity-50 transition-colors"
                            />

                            <button
                                onClick={handleSwap}
                                disabled={swapLoading || !swapPrompt.trim()}
                                className="w-full mt-3 py-3 rounded-xl bg-accent-purple text-white text-sm font-bold
                                           flex items-center justify-center gap-2
                                           hover:bg-accent-purple/85 transition-colors
                                           disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {swapLoading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Planning Swap...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft size={16} />
                                        Plan Swap
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Swap Result + Pending Transactions */}
                    {swapResult && (
                        <div className={`glass-card p-4 mb-4 border ${swapResult.status === 'completed'
                            ? 'border-accent-green/30'
                            : 'border-accent-red/30'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {swapResult.status === 'completed' ? (
                                    <CheckCircle size={16} className="text-accent-green" />
                                ) : (
                                    <XCircle size={16} className="text-accent-red" />
                                )}
                                <span className={`text-sm font-bold ${swapResult.status === 'completed' ? 'text-accent-green' : 'text-accent-red'
                                    }`}>
                                    {swapResult.status === 'completed'
                                        ? (pendingTxs.length > 0 ? 'Swap Ready — Confirm in Wallet' : 'Swap Planned')
                                        : `Swap ${swapResult.status}`}
                                </span>
                            </div>
                            <p className="text-sm text-foreground/70 whitespace-pre-wrap">{swapResult.response}</p>
                            {swapResult.jobId && (
                                <p className="text-[10px] text-foreground/30 mt-2 font-mono">Job: {swapResult.jobId}</p>
                            )}
                        </div>
                    )}

                    {/* Pending Transactions — Confirm & Execute */}
                    {pendingTxs.length > 0 && (
                        <div className="glass-card p-4 mb-4 border border-accent-purple/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Wallet size={16} className="text-accent-purple" />
                                <span className="text-sm font-bold text-accent-purple">
                                    {pendingTxs.length} Transaction{pendingTxs.length > 1 ? 's' : ''} to Sign
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                {pendingTxs.map((tx, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/8">
                                        <div className="w-6 h-6 rounded-full bg-accent-purple/15 flex items-center justify-center text-[10px] font-bold text-accent-purple">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground/80 truncate">{tx.description}</p>
                                            <p className="text-[10px] text-foreground/40 font-mono">
                                                {tx.type} • Chain {tx.chainId}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {txError && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent-red/10 border border-accent-red/20 mb-3">
                                    <XCircle size={14} className="text-accent-red shrink-0 mt-0.5" />
                                    <p className="text-xs text-accent-red">{txError}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={executeTxs}
                                    disabled={txExecuting}
                                    className="flex-1 py-3 rounded-xl bg-accent-green text-white text-sm font-bold
                                               flex items-center justify-center gap-2
                                               hover:bg-accent-green/85 transition-colors
                                               disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {txExecuting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Signing...
                                        </>
                                    ) : (
                                        <>
                                            <Wallet size={16} />
                                            Confirm &amp; Execute
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={resetSwap}
                                    disabled={txExecuting}
                                    className="px-4 py-3 rounded-xl border border-white/10 text-foreground/60 text-sm font-medium
                                               hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Executed Transaction Hashes */}
                    {txHashes.length > 0 && (
                        <div className="glass-card p-4 mb-4 border border-accent-green/30">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle size={16} className="text-accent-green" />
                                <span className="text-sm font-bold text-accent-green">
                                    Transaction{txHashes.length > 1 ? 's' : ''} Submitted!
                                </span>
                            </div>
                            <div className="space-y-2">
                                {txHashes.map((hash, i) => (
                                    <a
                                        key={i}
                                        href={`${BASESCAN_TX}${hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2.5 rounded-lg bg-accent-green/5 border border-accent-green/15
                                                   hover:bg-accent-green/10 transition-colors group"
                                    >
                                        <ExternalLink size={12} className="text-accent-green shrink-0" />
                                        <span className="text-xs font-mono text-accent-green/80 truncate group-hover:text-accent-green">
                                            {hash}
                                        </span>
                                    </a>
                                ))}
                            </div>
                            <button
                                onClick={resetSwap}
                                className="w-full mt-3 py-2 rounded-lg border border-white/10 text-foreground/50 text-xs font-medium
                                           hover:bg-white/5 transition-colors"
                            >
                                New Swap
                            </button>
                        </div>
                    )}

                    {/* Swap Quick Actions */}
                    {!swapLoading && !swapResult && !pendingTxs.length && !txHashes.length && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {swapQuickActions.map((action) => (
                                <button
                                    key={action}
                                    onClick={() => setSwapPrompt(action)}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 text-foreground/60
                                               hover:border-accent-purple/30 hover:text-accent-purple hover:bg-accent-purple/5
                                               transition-all duration-200"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Swap Warning */}
                    <div className="mt-auto">
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-accent-gold/5 border border-accent-gold/15">
                            <AlertTriangle size={14} className="text-accent-gold shrink-0 mt-0.5" />
                            <p className="text-[11px] text-accent-gold/80 leading-relaxed">
                                Swaps execute <strong>real on-chain transactions</strong> from <strong>your connected wallet</strong> on Base.
                                Bankr plans the route — you sign and confirm each transaction. Double-check before executing.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="mt-2 flex items-center gap-1.5 justify-center">
                <AlertTriangle size={10} className="text-foreground/25" />
                <p className="text-[10px] text-foreground/25">
                    {tab === 'chat'
                        ? 'Bankr Agent provides crypto information and on-chain actions. Not financial advice. Always DYOR.'
                        : 'On-chain swaps are irreversible. Use at your own risk.'}
                </p>
            </div>
        </div>
    );
}
