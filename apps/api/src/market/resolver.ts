import { getDb } from '../db/schema.js';
import { getDayPrice } from './ethPrice.js';
import { resolveDrawPredictions } from '../scoring/engine.js';
import { upsertNeonMarketSnapshot } from './neonStore.js';

const VOLATILITY_THRESHOLD = 0.03; // 3% move = volatile

/**
 * Resolve a completed day's predictions.
 * 1. Finalize close price = latest_price
 * 2. Calculate % change
 * 3. Determine outcome: bullish / bearish / high (volatile)
 * 4. Score all predictions for that day's tarot draw
 */
export async function resolveDay(date: string): Promise<boolean> {
    const db = getDb();
    const priceRow = getDayPrice(date) as any;

    if (!priceRow) {
        console.log(`[Resolve] No price data for ${date}, skipping`);
        return false;
    }

    if (priceRow.resolved) {
        console.log(`[Resolve] ${date} already resolved`);
        return false;
    }

    if (!priceRow.open_price || !priceRow.latest_price) {
        console.log(`[Resolve] ${date} missing open/latest price, skipping`);
        return false;
    }

    // Finalize close price
    const closePrice = priceRow.latest_price;
    const openPrice = priceRow.open_price;
    const change = (closePrice - openPrice) / openPrice;

    // Determine outcome
    let outcome: string;
    if (Math.abs(change) > VOLATILITY_THRESHOLD) {
        outcome = 'high'; // volatile wins
    } else if (change > 0) {
        outcome = 'bullish';
    } else {
        outcome = 'bearish';
    }

    // Update eth_prices row
    db.prepare(`
        UPDATE eth_prices
        SET close_price = ?, resolved = 1, resolved_outcome = ?, updated_at = datetime('now')
        WHERE date = ?
    `).run(closePrice, outcome, date);
    await upsertNeonMarketSnapshot({
        date,
        open_price: openPrice,
        close_price: closePrice,
        high_price: priceRow.high_price ?? null,
        low_price: priceRow.low_price ?? null,
        latest_price: closePrice,
        resolved: true,
        resolved_outcome: outcome,
    });

    console.log(`[Resolve] ${date}: $${openPrice.toFixed(2)} → $${closePrice.toFixed(2)} (${(change * 100).toFixed(2)}%) → ${outcome}`);

    // Find the tarot draw for this date and resolve its predictions
    const draw = db.prepare('SELECT id FROM tarot_draws WHERE date = ?').get(date) as any;
    if (draw) {
        resolveDrawPredictions(draw.id, outcome);
        console.log(`[Resolve] Scored predictions for draw #${draw.id}`);
    } else {
        console.log(`[Resolve] No tarot draw found for ${date}`);
    }

    return true;
}
