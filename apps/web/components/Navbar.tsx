'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Moon, Trophy, ScrollText, Wallet, LogOut } from 'lucide-react';
import { signInWithWallet, disconnect, getStoredWallet, isConnected, shortenAddress } from '@/lib/wallet';
import { getSelectedNetwork, setSelectedNetwork, type UserNetwork } from '@/lib/staking';

export default function Navbar() {
    const pathname = usePathname();
    const [wallet, setWallet] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [network, setNetwork] = useState<UserNetwork>('mainnet');

    useEffect(() => {
        setWallet(getStoredWallet());
        setConnected(isConnected());
        setNetwork(getSelectedNetwork());

        const syncNetwork = () => setNetwork(getSelectedNetwork());
        window.addEventListener('fatefi-network-changed', syncNetwork);
        return () => window.removeEventListener('fatefi-network-changed', syncNetwork);
    }, []);

    const switchNetwork = (next: UserNetwork) => {
        setSelectedNetwork(next);
        setNetwork(next);
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const { user } = await signInWithWallet();
            setWallet(user.wallet_address);
            setConnected(true);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setWallet(null);
        setConnected(false);
    };

    const links = [
        { href: '/', label: 'Home', icon: null },
        { href: '/draw', label: 'Daily Draw', icon: <Moon size={14} /> },
        { href: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
        { href: '/history', label: 'History', icon: <ScrollText size={14} /> },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image src="/OBJECTS.png" alt="FateFi" width={32} height={32} className="rounded-full" />
                        <span className="text-xl font-bold gradient-text">FateFi</span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === link.href
                                    ? 'bg-accent-purple/15 text-accent-purple'
                                    : 'text-foreground/55 hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Wallet Button */}
                    {connected && wallet ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                                <button
                                    onClick={() => switchNetwork('mainnet')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${network === 'mainnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                                >
                                    Mainnet
                                </button>
                                <button
                                    onClick={() => switchNetwork('testnet')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${network === 'testnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                                >
                                    Testnet
                                </button>
                            </div>
                            <div className="glass-card px-3 py-1.5 text-sm font-mono text-accent-gold flex items-center gap-2">
                                <Wallet size={12} />
                                {shortenAddress(wallet)}
                            </div>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center gap-1 text-xs text-foreground/40 hover:text-accent-red transition-colors"
                            >
                                <LogOut size={12} />
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                                <button
                                    onClick={() => switchNetwork('mainnet')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${network === 'mainnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                                >
                                    Mainnet
                                </button>
                                <button
                                    onClick={() => switchNetwork('testnet')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${network === 'testnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                                >
                                    Testnet
                                </button>
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent-purple text-white text-sm font-semibold 
                         hover:bg-accent-purple/90 transition-all duration-200 disabled:opacity-50"
                            >
                                <Wallet size={14} />
                                {connecting ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile nav */}
            <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10 mr-2">
                    <button
                        onClick={() => switchNetwork('mainnet')}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${network === 'mainnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                    >
                        Mainnet
                    </button>
                    <button
                        onClick={() => switchNetwork('testnet')}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${network === 'testnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                    >
                        Testnet
                    </button>
                </div>
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${pathname === link.href
                            ? 'bg-accent-purple/15 text-accent-purple'
                            : 'text-foreground/50 hover:text-foreground'
                            }`}
                    >
                        {link.icon}
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
