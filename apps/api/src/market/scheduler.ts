import { recordPrice, getISTTime, getYesterdayIST } from './ethPrice.js';
import { resolveDay } from './resolver.js';

const PRICE_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000;       // 1 minute

let lastResolvedDate = '';

/**
 * Start background tasks:
 * 1. Fetch ETH price every 5 minutes
 * 2. Check every minute if IST midnight crossed → resolve yesterday
 */
export function startScheduler() {
    console.log('[Scheduler] Starting ETH price tracker (every 5 min)');
    console.log('[Scheduler] Starting midnight resolver check (every 1 min)');

    // Fetch price immediately on boot
    void recordPrice();

    // Regular price polling
    setInterval(() => {
        void recordPrice();
    }, PRICE_INTERVAL_MS);

    // Midnight resolution check
    setInterval(() => {
        const { hour, minute } = getISTTime();

        // Resolve at 12:01 AM IST (or within the first 5 minutes after midnight)
        if (hour === 0 && minute <= 4) {
            const yesterday = getYesterdayIST();
            if (lastResolvedDate !== yesterday) {
                console.log(`[Scheduler] IST midnight crossed, resolving ${yesterday}`);
                void resolveDay(yesterday).then((resolved) => {
                    if (resolved) {
                        lastResolvedDate = yesterday;
                    }
                });
            }
        }
    }, CHECK_INTERVAL_MS);
}
