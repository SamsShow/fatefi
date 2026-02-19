import { recordPrice, getISTTime, getYesterdayIST, getISTDate } from './ethPrice.js';
import { resolveDay } from './resolver.js';
import { getDb } from '../db/schema.js';
import { drawCardForDate } from '../tarot/deck.js';

const PRICE_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000;       // 1 minute

let lastResolvedDate = '';
let lastNewCardDate = '';

/**
 * Initialize scheduler state from DB so we don't re-process on restart.
 */
function initStateFromDb() {
    try {
        const db = getDb();

        // Set lastResolvedDate from the most recently resolved eth_prices row
        const lastResolved = db.prepare(
            "SELECT date FROM eth_prices WHERE resolved = 1 ORDER BY date DESC LIMIT 1"
        ).get() as any;
        if (lastResolved) {
            lastResolvedDate = lastResolved.date;
            console.log(`[Scheduler] Restored lastResolvedDate: ${lastResolvedDate}`);
        }

        // Set lastNewCardDate from the most recent tarot_draws row
        const lastCard = db.prepare(
            "SELECT date FROM tarot_draws ORDER BY date DESC LIMIT 1"
        ).get() as any;
        if (lastCard) {
            lastNewCardDate = lastCard.date;
            console.log(`[Scheduler] Restored lastNewCardDate: ${lastNewCardDate}`);
        }
    } catch (err: any) {
        console.error('[Scheduler] Failed to init state from DB:', err.message);
    }
}

/**
 * Ensure today's tarot card exists in the DB.
 * Uses deterministic drawCardForDate() so the same date always produces the same card.
 */
function ensureTodayCard() {
    const today = getISTDate();
    createNewDayCard(today);
}

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

    // Restore state from DB so we don't re-resolve or duplicate on restart
    initStateFromDb();

    // Ensure today's card exists immediately on boot
    ensureTodayCard();

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
 * Uses deterministic drawCardForDate() for consistent results.
 */
function createNewDayCard(date: string) {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT id FROM tarot_draws WHERE date = ?').get(date);
        if (existing) {
            console.log(`[Scheduler] Card for ${date} already exists`);
            return;
        }

        const { card, orientation } = drawCardForDate(date);
        db.prepare('INSERT INTO tarot_draws (card_name, orientation, date) VALUES (?, ?, ?)')
            .run(card.name, orientation, date);

        console.log(`[Scheduler] New card for ${date}: ${card.name} (${orientation})`);
    } catch (err: any) {
        console.error(`[Scheduler] Failed to create new day card:`, err.message);
    }
}
