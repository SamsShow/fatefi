import Link from "next/link";
import Image from "next/image";
import { Flame, Trophy, AlertTriangle, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center py-20 md:py-32">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-[#0052FF]/20 mb-8">
          <Layers size={14} className="text-[#0052FF]" />
          <span className="text-sm font-medium text-foreground/80">Live on Base testnet</span>
        </div>
        {/* Fanned card showcase */}
        <div className="relative w-64 h-48 mx-auto mb-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-[70%] -translate-y-1/2 -rotate-12 w-28 h-44 rounded-xl overflow-hidden shadow-elevated opacity-60 hover:opacity-90 transition-opacity duration-300">
            <Image src="/tarot/major/0.png" alt="The Fool" fill className="object-cover" sizes="112px" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] w-32 h-48 rounded-xl overflow-hidden shadow-elevated z-10 hover:scale-105 transition-transform duration-300">
            <Image src="/tarot/major/17.png" alt="The Star" fill className="object-cover" sizes="128px" priority />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-[30%] -translate-y-1/2 rotate-12 w-28 h-44 rounded-xl overflow-hidden shadow-elevated opacity-60 hover:opacity-90 transition-opacity duration-300">
            <Image src="/tarot/major/1.png" alt="The Magician" fill className="object-cover" sizes="112px" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <span className="gradient-text">The Cards Know.</span>
          <br />
          <span className="text-foreground/80">Do You?</span>
        </h1>
        <p className="text-lg md:text-xl text-foreground/45 max-w-2xl mx-auto mb-10 leading-relaxed">
          Draw a tarot card. Let AI decode the cosmic signals.
          <br className="hidden md:block" />
          Predict the market. Climb the leaderboard. Embrace the fate.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/draw"
            className="px-8 py-4 rounded-2xl bg-accent-purple text-white text-lg font-bold
                       hover:bg-accent-purple/90 transition-all duration-300 shadow-card"
          >
            Draw Today&apos;s Card
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-4 rounded-2xl glass-card text-foreground text-lg font-semibold
                       hover:bg-white/8 transition-all duration-300"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12 gradient-text">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              image: '/tarot/major/10.png',
              title: 'Draw a Card',
              description: 'A tarot card is drawn daily using cryptographic randomness. Every card carries unique market energy.',
            },
            {
              step: '02',
              image: '/tarot/major/2.png',
              title: 'AI Interprets',
              description: 'Our AI oracle decodes the card\'s symbolism into a market prediction narrative. Pure entertainment, pure vibes.',
            },
            {
              step: '03',
              image: '/tarot/major/19.png',
              title: 'Predict & Score',
              description: 'Submit your prediction — bullish, bearish, or volatile. Track your accuracy, build streaks, top the leaderboard.',
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-8 text-center group hover:border-accent-purple/20 transition-all duration-300">
              <div className="relative w-16 h-24 mx-auto mb-5 rounded-lg overflow-hidden shadow-card">
                <Image src={item.image} alt={item.title} fill className="object-cover" sizes="64px" />
              </div>
              <div className="text-accent-purple text-xs font-mono tracking-widest mb-2 opacity-70">STEP {item.step}</div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-foreground/45 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="glass-card p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '78', label: 'Tarot Cards', sublabel: 'Full Deck' },
              { value: '∞', label: 'Predictions', sublabel: 'Unlimited Daily' },
              { value: null, label: 'Streak System', sublabel: 'Bonus Points', icon: <Flame size={28} className="text-accent-gold mx-auto mb-1" /> },
              { value: null, label: 'Leaderboard', sublabel: 'Global Rankings', icon: <Trophy size={28} className="text-accent-gold mx-auto mb-1" /> },
            ].map((stat, i) => (
              <div key={i}>
                {stat.icon
                  ? stat.icon
                  : <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
                }
                <div className="text-sm font-semibold text-foreground/70">{stat.label}</div>
                <div className="text-xs text-foreground/40">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 text-center">
        <div className="glass-card inline-flex items-center gap-2 px-6 py-3">
          <AlertTriangle size={14} className="text-foreground/30 shrink-0" />
          <p className="text-foreground/40 text-xs text-left">
            FateFi is a gamified entertainment platform. All predictions are based on symbolic tarot randomness and AI-generated narratives.
            This is <strong>not financial advice</strong>. Always DYOR.
          </p>
        </div>
      </section>
    </div>
  );
}
