import { getDb } from '../db/schema.js';
import { upsertNeonMarketSnapshot } from './neonStore.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

// ─── IST Helpers (Asia/Kolkata via Intl API) ──────────────
const IST_TZ = 'Asia/Kolkata';

/** Get the current date string in IST (YYYY-MM-DD) */
export function getISTDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ }).format(new Date());
}

/** Get yesterday's date string in IST (YYYY-MM-DD) */
export function getYesterdayIST(): string {
    const now = new Date();
    // Subtract 1 day in UTC then format in IST
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ }).format(yesterday);
}

/** Get current IST hour (0-23) and minute (0-59) */
export function getISTTime(): { hour: number; minute: number } {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: IST_TZ,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
    return { hour, minute };
}

// ─── Price Fetching ──────────────────────────────────────
/** Fetch current ETH/USD price from CoinGecko (no paid fallback) */
export async function fetchEthPrice(): Promise<number> {
    const res = await fetch(COINGECKO_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();
    return data.ethereum.usd;
}

// ─── Price Recording ─────────────────────────────────────

/** Fetch current price and upsert into eth_prices for today (IST) */
export async function recordPrice(): Promise<void> {
    try {
        const price = await fetchEthPrice();
        const date = getISTDate();
        const db = getDb();

        const existing = db.prepare('SELECT * FROM eth_prices WHERE date = ?').get(date) as any;

        if (!existing) {
            // First fetch of the day — set open price
            db.prepare(`
                INSERT INTO eth_prices (date, open_price, high_price, low_price, latest_price)
                VALUES (?, ?, ?, ?, ?)
            `).run(date, price, price, price, price);
            console.log(`[ETH] New day ${date} — open: $${price.toFixed(2)}`);
            await upsertNeonMarketSnapshot({
                date,
                open_price: price,
                close_price: null,
                high_price: price,
                low_price: price,
                latest_price: price,
                resolved: false,
                resolved_outcome: null,
            });
        } else {
            // Update existing row
            const high = Math.max(existing.high_price ?? price, price);
            const low = Math.min(existing.low_price ?? price, price);
            db.prepare(`
                UPDATE eth_prices
                SET latest_price = ?, high_price = ?, low_price = ?, updated_at = datetime('now')
                WHERE date = ?
            `).run(price, high, low, date);
            await upsertNeonMarketSnapshot({
                date,
                open_price: existing.open_price ?? null,
                close_price: existing.close_price ?? null,
                high_price: high,
                low_price: low,
                latest_price: price,
                resolved: Boolean(existing.resolved),
                resolved_outcome: existing.resolved_outcome ?? null,
            });
        }
    } catch (err: any) {
        console.error(`[ETH] Price fetch failed:`, err.message);
    }
}

// ─── Price Queries ───────────────────────────────────────

/** Get today's ETH price snapshot (IST date) */
export function getTodayPrice() {
    const db = getDb();
    const date = getISTDate();
    return db.prepare('SELECT * FROM eth_prices WHERE date = ?').get(date);
}

/** Get a specific day's ETH price snapshot */
export function getDayPrice(date: string) {
    const db = getDb();
    return db.prepare('SELECT * FROM eth_prices WHERE date = ?').get(date);
}
