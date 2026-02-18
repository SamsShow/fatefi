'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getCardImagePath } from '@/lib/cardImages';

interface TarotCardProps {
    cardName: string;
    orientation: 'upright' | 'reversed';
    isRevealed?: boolean;
    onReveal?: () => void;
}

type RevealState = 'idle' | 'revealing' | 'revealed';

export default function TarotCard({ cardName, orientation, isRevealed = false, onReveal }: TarotCardProps) {
    const [revealState, setRevealState] = useState<RevealState>(isRevealed ? 'revealed' : 'idle');
    const [showFlash, setShowFlash] = useState(false);

    const handleClick = () => {
        if (revealState !== 'idle') return;

        // Trigger flash + reveal animation simultaneously
        setShowFlash(true);
        setRevealState('revealing');
        onReveal?.();

        // Remove flash after its animation ends
        setTimeout(() => setShowFlash(false), 700);
        // Lock reveal state after animation ends
        setTimeout(() => setRevealState('revealed'), 900);
    };

    const imagePath = getCardImagePath(cardName);

    return (
        <>
            {/* Viewport-wide white flash */}
            {showFlash && (
                <div
                    className="white-flash fixed inset-0 pointer-events-none z-50"
                    style={{ background: 'white' }}
                />
            )}

            {/* ── Idle / Back of card ── */}
            {revealState === 'idle' && (
                <div
                    className="mx-auto cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform duration-150"
                    style={{ width: '260px', height: '420px' }}
                    onClick={handleClick}
                >
                    <div
                        className="w-full h-full flex flex-col items-center justify-center relative rounded-2xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, #131729 0%, #0e1220 50%, #131729 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.09)',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* Spinning rings */}
                        <div className="relative w-32 h-32 mb-5">
                            <div className="absolute inset-0 rounded-full border border-white/8 animate-[spin_20s_linear_infinite]" />
                            <div className="absolute inset-3 rounded-full border border-accent-purple/15 animate-[spin_15s_linear_infinite_reverse]" />
                            <div className="absolute inset-6 rounded-full border border-accent-gold/10 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Image
                                    src="/tarot/major/17.png"
                                    alt="card back"
                                    width={60}
                                    height={90}
                                    className="rounded-md opacity-25 blur-[1px]"
                                />
                            </div>
                        </div>
                        <div className="text-foreground/35 text-sm font-medium tracking-widest uppercase">
                            Tap to Reveal
                        </div>
                        <div className="mt-3 w-14 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                        {/* Corner accents */}
                        <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-white/10 rounded-tl-md" />
                        <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-white/10 rounded-tr-md" />
                        <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-white/10 rounded-bl-md" />
                        <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-white/10 rounded-br-md" />
                    </div>
                </div>
            )}

            {/* ── Revealing / Revealed — actual card face ── */}
            {(revealState === 'revealing' || revealState === 'revealed') && (
                <div
                    className={`mx-auto ${revealState === 'revealing' ? 'card-reveal' : ''}`}
                    style={{ width: '260px' }}
                >
                    <div
                        className="w-full flex flex-col items-center rounded-2xl overflow-hidden"
                        style={{
                            background: orientation === 'upright'
                                ? 'linear-gradient(160deg, #141830 0%, #1c2145 100%)'
                                : 'linear-gradient(160deg, #1e1325 0%, #141830 100%)',
                            border: `1px solid ${orientation === 'upright' ? 'rgba(124,106,247,0.22)' : 'rgba(192,69,90,0.22)'}`,
                            boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
                        }}
                    >
                        {/* Orientation badge */}
                        <div className="w-full flex justify-end px-3 pt-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border
                                ${orientation === 'upright'
                                    ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                                    : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}
                            >
                                {orientation === 'upright' ? '△ Upright' : '▽ Reversed'}
                            </span>
                        </div>

                        {/* Card image — full card with padding so borders show */}
                        <div className={`relative mx-3 mb-0 rounded-lg overflow-hidden ${orientation === 'reversed' ? 'rotate-180' : ''}`}
                            style={{ width: '220px', height: '340px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                        >
                            <Image
                                src={imagePath}
                                alt={cardName}
                                fill
                                className="object-contain"
                                sizes="220px"
                                priority
                            />
                        </div>

                        {/* Card name */}
                        <div className="text-center px-4 py-3">
                            <h3 className="text-base font-bold text-foreground leading-tight">{cardName}</h3>
                            <div className={`text-xs font-medium mt-0.5 ${orientation === 'upright' ? 'text-accent-purple' : 'text-accent-red'}`}>
                                {orientation === 'upright' ? 'Upright' : 'Reversed'}
                            </div>
                        </div>

                        {/* Bottom accent line */}
                        <div className="w-16 h-px mb-3 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
                    </div>
                </div>
            )}
        </>
    );
}
