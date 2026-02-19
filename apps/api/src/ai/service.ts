import type { AIInterpretation, Orientation } from '@fatefi/shared-types';

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';

// ─── Fallback interpretations when OpenClaw is unavailable ───
const FALLBACK_INTERPRETATIONS: Record<string, AIInterpretation> = {
    default_upright: {
        prediction: 'The cosmic energies suggest a rising tide — an upward momentum is building beneath the market surface. The stars are aligning for bulls who dare to hold their ground. Expect steady upward pressure through the day, with potential breakout energy building in the late hours.',
        narrative: 'The card drawn upright channels pure ascending energy. Like a bullish candle breaking through key resistance, the universe hints at gains for those bold enough to ride the wave. The stars whisper of green charts and diamond hands prevailing. Ancient market spirits speak of accumulation zones forming — the wise ones are loading their bags while the fearful stand aside. The celestial alignment favors momentum traders today, but remember: even the moon must set before it can rise anew.',
        confidence_tone: 'Mystically Bullish 🔮📈',
        market_mood: 'Bullish Accumulation — The ethereal bulls are gathering strength. Momentum favors the bold.',
        key_levels: 'Watch for resistance near round-number psychological levels. Support forms at yesterday\'s close.',
        cosmic_tip: '💎 Diamond hands may be rewarded today. The cosmos favors patience over panic selling — but keep a stop-loss as even the stars can shift.',
        disclaimer: '🃏 This is pure entertainment and mystical vibes — not financial advice. Always DYOR and never trade based on tarot readings!',
    },
    default_reversed: {
        prediction: 'Reversed energies signal turbulence ahead — the market spirits are restless and unpredictable. A storm brews in the celestial charts, warning of sudden moves and emotional trading. The bears are stirring from their cosmic slumber, and the path of least resistance points downward.',
        narrative: 'When the card falls reversed, it speaks of bearish undercurrents and hidden volatility. Like a rug pull foretold in the stars, caution is the arcana\'s counsel. The moon casts long shadows on tonight\'s charts. Seasoned cosmonauts know this energy well — it\'s the kind of day where leverage gets liquidated and overconfident traders learn humility. The reversed card doesn\'t necessarily mean disaster, but it demands respect. Those who hedge and wait will outlast those who FOMO into the void.',
        confidence_tone: 'Cosmically Cautious 🌙📉',
        market_mood: 'Bearish Caution — The ethereal bears prowl the charts. Defensive positioning is the cosmic counsel.',
        key_levels: 'Support levels face tests today. A break below yesterday\'s low could trigger cascading stops.',
        cosmic_tip: '🛡️ Consider tightening stops and reducing exposure. The reversed card favors capital preservation — live to trade another day.',
        disclaimer: '🃏 This is pure entertainment and mystical vibes — not financial advice. Always DYOR and never trade based on tarot readings!',
    },
};

/**
 * Get AI interpretation for a tarot card from OpenClaw.
 * Falls back to pre-written mystical content if OpenClaw is unavailable.
 */
export async function getInterpretation(
    cardName: string,
    orientation: Orientation,
    marketContext?: string
): Promise<AIInterpretation> {
    try {
        const prompt = buildPrompt(cardName, orientation, marketContext);

        const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(OPENCLAW_TOKEN ? { Authorization: `Bearer ${OPENCLAW_TOKEN}` } : {}),
            },
            body: JSON.stringify({
                model: 'default',
                messages: [
                    {
                        role: 'system',
                        content: `You are FateFi's mystical AI oracle — a dramatic, crypto-native fortune teller channeling ancient tarot wisdom into modern market vibes.

Your interpretations should be RICH, DETAILED, and ENTERTAINING. Write like a mystical degen sage who reads the blockchain in the stars.

Rules:
- prediction: 2-3 sentences. Bold, dramatic market direction call with cosmic flair.
- narrative: 4-6 sentences. Tell a mystical story weaving tarot symbolism with crypto culture. Reference diamond hands, rug pulls, moon missions, whale movements, support/resistance, candlestick patterns — make it fun!
- confidence_tone: A short fun tagline with emojis (e.g. "Cosmically Bullish 🌕🚀" or "Mystically Uncertain 🌫️🎭")
- market_mood: 1-2 sentences describing the overall vibe/sentiment the card suggests.
- key_levels: A short note about what to watch for (support, resistance, volatility zones) — keep it mystical.
- cosmic_tip: 1-2 sentences of actionable cosmic wisdom with an emoji. Fun and memorable.
- disclaimer: Always state this is entertainment only, not financial advice.

Respond in valid JSON with keys: prediction, narrative, confidence_tone, market_mood, key_levels, cosmic_tip, disclaimer.`,
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.9,
                max_tokens: 800,
            }),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Try to parse JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                prediction: parsed.prediction || 'The stars are unclear...',
                narrative: parsed.narrative || 'The cosmic energies swirl with possibility.',
                confidence_tone: parsed.confidence_tone || 'Mystical 🔮',
                market_mood: parsed.market_mood || null,
                key_levels: parsed.key_levels || null,
                cosmic_tip: parsed.cosmic_tip || null,
                disclaimer: parsed.disclaimer || '🃏 Entertainment only. Not financial advice.',
            };
        }

        // If we can't parse JSON, wrap the raw text
        return {
            prediction: content.slice(0, 200),
            narrative: content,
            confidence_tone: 'Mystical 🔮',
            disclaimer: '⚠️ Entertainment only. Not financial advice.',
        };
    } catch (err) {
        console.warn('OpenClaw unavailable, using fallback interpretation:', (err as Error).message);
        return FALLBACK_INTERPRETATIONS[`default_${orientation}`] || FALLBACK_INTERPRETATIONS.default_upright;
    }
}

function buildPrompt(cardName: string, orientation: Orientation, marketContext?: string): string {
    return `
Card: ${cardName}
Orientation: ${orientation}
${marketContext ? `Market Context: ${marketContext}` : ''}

Generate a DETAILED, mystical tarot interpretation framed as an entertainment market prediction.
Be dramatic, rich, and fun — like a legendary degen oracle channeling ancient tarot wisdom.
Include references to crypto culture (diamond hands, rug pulls, moon missions, whale activity, candlestick patterns, support/resistance, etc.) where fitting.
Make the prediction bold, the narrative a rich story, and the cosmic_tip memorable and shareable.
Respond as valid JSON with keys: prediction, narrative, confidence_tone, market_mood, key_levels, cosmic_tip, disclaimer.
  `.trim();
}
