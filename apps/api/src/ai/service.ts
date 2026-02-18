import type { AIInterpretation, Orientation } from '@fatefi/shared-types';

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';

// ─── Fallback interpretations when OpenClaw is unavailable ───
const FALLBACK_INTERPRETATIONS: Record<string, AIInterpretation> = {
    default_upright: {
        prediction: 'The cosmic energies suggest a rising tide — an upward momentum building beneath the surface of the markets.',
        narrative: 'The card drawn upright channels pure ascending energy. Like a bullish candle breaking through resistance, the universe hints at gains for those bold enough to ride the wave. The stars whisper of green charts and diamond hands prevailing.',
        confidence_tone: 'Mystically Bullish 🔮📈',
        disclaimer: '⚠️ This is entertainment only. Not financial advice. Always DYOR.',
    },
    default_reversed: {
        prediction: 'Reversed energies signal turbulence ahead — the market spirits are restless and unpredictable.',
        narrative: 'When the card falls reversed, it speaks of bearish undercurrents and hidden volatility. Like a rug pull foretold in the stars, caution is the arcana\'s counsel. The moon casts long shadows on tonight\'s charts.',
        confidence_tone: 'Cosmically Cautious 🌙📉',
        disclaimer: '⚠️ This is entertainment only. Not financial advice. Always DYOR.',
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
                        content: `You are FateFi's mystical AI oracle. You generate symbolic tarot interpretations framed as entertainment market predictions. Your tone is dramatic, mystical, and engaging — like a crypto-native fortune teller. Always include a disclaimer that this is entertainment only and not financial advice. Respond in valid JSON format with these exact keys: prediction, narrative, confidence_tone, disclaimer.`,
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.9,
                max_tokens: 500,
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
                disclaimer: parsed.disclaimer || '⚠️ Entertainment only. Not financial advice.',
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

Generate a mystical, engaging tarot interpretation framed as an entertainment market prediction. 
Be dramatic and fun — like a degen crypto oracle channeling ancient wisdom.
Include references to crypto culture (diamond hands, rug pulls, moon, pump, etc.) where fitting.
Respond as valid JSON with keys: prediction, narrative, confidence_tone, disclaimer.
  `.trim();
}
