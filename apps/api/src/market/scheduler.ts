import { recordPrice, getISTTime, getYesterdayIST, getISTDate } from './ethPrice.js';
import { resolveDay } from './resolver.js';
import { getDb } from '../db/schema.js';
import { drawRandomCard } from '../tarot/deck.js';

const PRICE_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000;       // 1 minute

let lastResolvedDate = '';
let lastNewCardDate = '';

/**
 * Start background tasks:
 * 1. Fetch ETH price every 5 minutes
 * 2. Check every minute for day boundary:
 *    - 12:01 AM IST → resolve yesterday's predictions + pool
 *    - 12:02 AM IST → create today's new tarot card
 */
export function startScheduler() {
    console.log('[Scheduler] Starting ETH price tracker (every 5 min)');
    console.log('[Scheduler] Starting day boundary checker (every 1 min)');

    // Fetch price immediately on boot
    void recordPrice();

    // Regular price polling
    setInterval(() => {
        void recordPrice();
    }, PRICE_INTERVAL_MS);

    // Day boundary check
    setInterval(() => {
        const { hour, minute } = getISTTime();

        // 12:01 AM IST — Resolve yesterday
        if (hour === 0 && minute >= 1 && minute <= 4) {
            const yesterday = getYesterdayIST();
            if (lastResolvedDate !== yesterday) {
                console.log(`[Scheduler] 12:01 AM IST — resolving ${yesterday}`);
                void resolveDay(yesterday).then((resolved) => {
                    if (resolved) {
                        lastResolvedDate = yesterday;
                    }
                });
            }
        }

        // 12:02 AM IST — Create new day's card
        if (hour === 0 && minute >= 2 && minute <= 5) {
            const today = getISTDate();
            if (lastNewCardDate !== today) {
                createNewDayCard(today);
                lastNewCardDate = today;
            }
        }
    }, CHECK_INTERVAL_MS);
}

/**
 * Pre-create today's tarot draw so it's ready when users arrive.
 */
function createNewDayCard(date: string) {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT id FROM tarot_draws WHERE date = ?').get(date);
        if (existing) {
            console.log(`[Scheduler] Card for ${date} already exists`);
            return;
        }

        const { card, orientation } = drawRandomCard();
        db.prepare('INSERT INTO tarot_draws (card_name, orientation, date) VALUES (?, ?, ?)')
            .run(card.name, orientation, date);

        console.log(`[Scheduler] 12:02 AM IST — New card for ${date}: ${card.name} (${orientation})`);
    } catch (err: any) {
        console.error(`[Scheduler] Failed to create new day card:`, err.message);
    }
}
