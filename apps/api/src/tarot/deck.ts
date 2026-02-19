import { randomInt } from 'crypto';
import type { TarotCard, Orientation } from '@fatefi/shared-types';

// ─── Full 78-Card Tarot Deck ─────────────────────────────
const MAJOR_ARCANA: TarotCard[] = [
    { name: 'The Fool', arcana: 'major', number: 0, keywords: ['beginnings', 'spontaneity', 'leap of faith'] },
    { name: 'The Magician', arcana: 'major', number: 1, keywords: ['manifestation', 'power', 'action'] },
    { name: 'The High Priestess', arcana: 'major', number: 2, keywords: ['intuition', 'mystery', 'inner knowledge'] },
    { name: 'The Empress', arcana: 'major', number: 3, keywords: ['abundance', 'nurturing', 'fertility'] },
    { name: 'The Emperor', arcana: 'major', number: 4, keywords: ['authority', 'structure', 'control'] },
    { name: 'The Hierophant', arcana: 'major', number: 5, keywords: ['tradition', 'conformity', 'institutions'] },
    { name: 'The Lovers', arcana: 'major', number: 6, keywords: ['union', 'choices', 'alignment'] },
    { name: 'The Chariot', arcana: 'major', number: 7, keywords: ['willpower', 'victory', 'determination'] },
    { name: 'Strength', arcana: 'major', number: 8, keywords: ['courage', 'patience', 'inner strength'] },
    { name: 'The Hermit', arcana: 'major', number: 9, keywords: ['introspection', 'solitude', 'guidance'] },
    { name: 'Wheel of Fortune', arcana: 'major', number: 10, keywords: ['cycles', 'destiny', 'turning point'] },
    { name: 'Justice', arcana: 'major', number: 11, keywords: ['fairness', 'truth', 'cause and effect'] },
    { name: 'The Hanged Man', arcana: 'major', number: 12, keywords: ['surrender', 'new perspective', 'pause'] },
    { name: 'Death', arcana: 'major', number: 13, keywords: ['transformation', 'endings', 'transition'] },
    { name: 'Temperance', arcana: 'major', number: 14, keywords: ['balance', 'moderation', 'patience'] },
    { name: 'The Devil', arcana: 'major', number: 15, keywords: ['bondage', 'materialism', 'shadow self'] },
    { name: 'The Tower', arcana: 'major', number: 16, keywords: ['upheaval', 'chaos', 'sudden change'] },
    { name: 'The Star', arcana: 'major', number: 17, keywords: ['hope', 'inspiration', 'renewal'] },
    { name: 'The Moon', arcana: 'major', number: 18, keywords: ['illusion', 'fear', 'subconscious'] },
    { name: 'The Sun', arcana: 'major', number: 19, keywords: ['joy', 'success', 'vitality'] },
    { name: 'Judgement', arcana: 'major', number: 20, keywords: ['rebirth', 'reflection', 'reckoning'] },
    { name: 'The World', arcana: 'major', number: 21, keywords: ['completion', 'integration', 'accomplishment'] },
];

const SUITS: Array<'wands' | 'cups' | 'swords' | 'pentacles'> = ['wands', 'cups', 'swords', 'pentacles'];
const COURT = ['Page', 'Knight', 'Queen', 'King'];
const SUIT_KEYWORDS: Record<string, string[]> = {
    wands: ['passion', 'energy', 'inspiration'],
    cups: ['emotions', 'intuition', 'relationships'],
    swords: ['intellect', 'conflict', 'truth'],
    pentacles: ['wealth', 'material', 'prosperity'],
};

function buildMinorArcana(): TarotCard[] {
    const cards: TarotCard[] = [];
    for (const suit of SUITS) {
        // Numbered cards (Ace through 10)
        for (let n = 1; n <= 10; n++) {
            const name = n === 1 ? `Ace of ${capitalize(suit)}` : `${n} of ${capitalize(suit)}`;
            cards.push({ name, arcana: 'minor', suit, number: n, keywords: SUIT_KEYWORDS[suit] });
        }
        // Court cards
        for (let i = 0; i < COURT.length; i++) {
            cards.push({
                name: `${COURT[i]} of ${capitalize(suit)}`,
                arcana: 'minor',
                suit,
                number: 11 + i,
                keywords: SUIT_KEYWORDS[suit],
            });
        }
    }
    return cards;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export const FULL_DECK: TarotCard[] = [...MAJOR_ARCANA, ...buildMinorArcana()];

/**
 * Simple FNV-1a hash that maps a string to a 32-bit unsigned integer.
 * Used to create a deterministic seed from a date string.
 */
function fnv1aHash(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0; // keep as unsigned 32-bit
    }
    return hash;
}

/**
 * Draw a deterministic tarot card for a given date.
 * The same date string always produces the same card + orientation.
 */
export function drawCardForDate(date: string): { card: TarotCard; orientation: Orientation } {
    const seed = fnv1aHash(`fatefi-daily-${date}`);
    const index = seed % FULL_DECK.length;
    const card = FULL_DECK[index];
    const orientation: Orientation = (seed >>> 16) % 2 === 0 ? 'upright' : 'reversed';
    return { card, orientation };
}

/**
 * Draw a random tarot card with cryptographic randomness.
 * @deprecated Use drawCardForDate() for daily draws.
 */
export function drawRandomCard(): { card: TarotCard; orientation: Orientation } {
    const index = randomInt(FULL_DECK.length);
    const card = FULL_DECK[index];
    const orientation: Orientation = randomInt(2) === 0 ? 'upright' : 'reversed';
    return { card, orientation };
}
