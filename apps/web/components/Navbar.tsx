'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Moon, Trophy, ScrollText, Wallet, LogOut, Coins, ExternalLink, Menu, X } from 'lucide-react';
import { signInWithWallet, disconnect, getStoredWallet, isConnected, shortenAddress } from '@/lib/wallet';
import { getSelectedNetwork, setSelectedNetwork, type UserNetwork } from '@/lib/staking';

export default function Navbar() {
    const pathname = usePathname();
    const [wallet, setWallet] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [network, setNetwork] = useState<UserNetwork>('mainnet');
    const [menuOpen, setMenuOpen] = useState(false);

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

    const closeMenu = () => setMenuOpen(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group shrink-0">
                        <Image src="/OBJECTS.png" alt="FateFi" width={32} height={32} className="rounded-full" />
                        <span className="text-xl font-bold gradient-text">FateFi</span>
                    </Link>

                    {/* Desktop: Nav Links */}
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

                    {/* Desktop: Right section */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
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
                        <div className="token-link-neon">
                            <a
                                href="https://flaunch.gg/base/coin/0x0f2256f7da1f858c30cbfb9530a023fa4210e6d2"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-accent-gold hover:text-accent-gold/90 transition-colors"
                            >
                                <Coins size={14} />
                                Token
                                <ExternalLink size={10} className="opacity-70" />
                            </a>
                        </div>
                        {connected && wallet ? (
                            <div className="flex items-center gap-3">
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
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent-purple text-white text-sm font-semibold
                                    hover:bg-accent-purple/90 transition-all duration-200 disabled:opacity-50"
                            >
                                <Wallet size={14} />
                                {connecting ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        )}
                    </div>

                    {/* Mobile: Hamburger only */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="md:hidden p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu overlay */}
            {menuOpen && (
                <div
                    className="md:hidden fixed inset-0 top-14 h-[calc(100vh-3.5rem)] bg-background/95 backdrop-blur-xl border-t border-white/5 z-40 overflow-y-auto"
                    onClick={closeMenu}
                >
                    <div className="p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
                        {/* Network */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10 mb-4">
                            <button
                                onClick={() => switchNetwork('mainnet')}
                                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${network === 'mainnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                            >
                                Mainnet
                            </button>
                            <button
                                onClick={() => switchNetwork('testnet')}
                                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${network === 'testnet' ? 'bg-accent-purple text-white' : 'text-foreground/55 hover:text-foreground'}`}
                            >
                                Testnet
                            </button>
                        </div>
                        {/* Token */}
                        <a
                            href="https://flaunch.gg/base/coin/0x0f2256f7da1f858c30cbfb9530a023fa4210e6d2"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-3 rounded-xl text-accent-gold hover:bg-white/5 transition-colors mb-4"
                        >
                            <Coins size={18} />
                            Token
                            <ExternalLink size={14} className="opacity-70" />
                        </a>
                        {/* Nav links */}
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMenu}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${pathname === link.href
                                    ? 'bg-accent-purple/15 text-accent-purple'
                                    : 'text-foreground/80 hover:bg-white/5'
                                    }`}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}
                        {/* Wallet */}
                        <div className="pt-4 mt-4 border-t border-white/10">
                            {connected && wallet ? (
                                <div className="flex flex-col gap-2">
                                    <div className="glass-card px-4 py-3 text-sm font-mono text-accent-gold flex items-center gap-2">
                                        <Wallet size={16} />
                                        {shortenAddress(wallet)}
                                    </div>
                                    <button
                                        onClick={() => { handleDisconnect(); closeMenu(); }}
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-foreground/60 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => { await handleConnect(); closeMenu(); }}
                                    disabled={connecting}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent-purple text-white font-semibold transition-colors disabled:opacity-50"
                                >
                                    <Wallet size={16} />
                                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
