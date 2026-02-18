/**
 * Maps tarot card names (as used by the API) to their image paths in /public/tarot/.
 */

// ─── Major Arcana name → number ───────────────────────────
const MAJOR_ARCANA_MAP: Record<string, number> = {
  'The Fool': 0,
  'The Magician': 1,
  'The High Priestess': 2,
  'The Empress': 3,
  'The Emperor': 4,
  'The Hierophant': 5,
  'The Lovers': 6,
  'The Chariot': 7,
  'Strength': 8,
  'The Hermit': 9,
  'Wheel of Fortune': 10,
  'Justice': 11,
  'The Hanged Man': 12,
  'Death': 13,
  'Temperance': 14,
  'The Devil': 15,
  'The Tower': 16,
  'The Star': 17,
  'The Moon': 18,
  'The Sun': 19,
  'Judgement': 20,
  'The World': 21,
};

// ─── Court card names ─────────────────────────────────────
const COURT_NAMES = ['page', 'knight', 'queen', 'king'];

/**
 * Given a card name like "The Fool", "Ace of Cups", "Knight of Swords",
 * returns the public image path e.g. "/tarot/major/0.png", "/tarot/cups/1.png".
 */
export function getCardImagePath(cardName: string): string {
  // Check Major Arcana first
  if (cardName in MAJOR_ARCANA_MAP) {
    return `/tarot/major/${MAJOR_ARCANA_MAP[cardName]}.png`;
  }

  // Minor Arcana: parse "X of Suit"
  const match = cardName.match(/^(.+)\s+of\s+(\w+)$/i);
  if (!match) {
    // Fallback — return The Fool
    return '/tarot/major/0.png';
  }

  const [, rank, suit] = match;
  const suitLower = suit.toLowerCase();

  // Court cards
  const courtIndex = COURT_NAMES.indexOf(rank.toLowerCase());
  if (courtIndex !== -1) {
    return `/tarot/${suitLower}/${COURT_NAMES[courtIndex]}.png`;
  }

  // Numbered cards: "Ace" = 1, "2" = 2, etc.
  const num = rank.toLowerCase() === 'ace' ? 1 : parseInt(rank, 10);
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return `/tarot/${suitLower}/${num}.png`;
  }

  // Fallback
  return '/tarot/major/0.png';
}

/**
 * Returns the back-of-card image path (using a known card for the mystical back).
 * In-app we use CSS for the card back, but this can be useful for thumbnails.
 */
export function getRandomShowcaseCards(): string[] {
  return [
    '/tarot/major/17.png', // The Star
    '/tarot/major/0.png',  // The Fool
    '/tarot/major/1.png',  // The Magician
  ];
}
