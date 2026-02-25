'use client';

import BankrChat from '@/components/BankrChat';
import { Bot } from 'lucide-react';

export default function BankrPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-accent-purple/25 mb-4">
                    <Bot size={14} className="text-accent-purple" />
                    <span className="text-sm font-medium text-foreground/70">AI Crypto Agent</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    <span className="gradient-text">Bankr Terminal</span>
                </h1>
                <p className="text-foreground/45 text-sm max-w-lg mx-auto">
                    Chat with Bankr — an AI agent that can check balances, swap tokens,
                    place limit orders, and execute crypto operations in plain English.
                </p>
            </div>

            {/* Chat Component */}
            <BankrChat />
        </div>
    );
}
