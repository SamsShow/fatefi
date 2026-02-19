import { Router } from 'express';
import type { Request, Response } from 'express';
import { getTodayPrice, getDayPrice, getYesterdayIST, fetchEthPrice } from './ethPrice.js';
import { authMiddleware } from '../auth/routes.js';
import { getNeonDaySnapshot, isNeonMarketStoreEnabled } from './neonStore.js';

const router: Router = Router();
router.use(authMiddleware);

/**
 * GET /api/market/price
 * Returns current ETH/USD price and today's snapshot (open, high, low, latest).
 */
router.get('/price', async (_req: Request, res: Response) => {
    try {
        let currentPrice: number | null = null;
        try {
            currentPrice = await fetchEthPrice();
        } catch {
            // Fall back to latest stored price
        }

        const today = getTodayPrice() as any;

        res.json({
            success: true,
            data: {
                current_price: currentPrice ?? today?.latest_price ?? null,
                today: today ? {
                    date: today.date,
                    open_price: today.open_price,
                    high_price: today.high_price,
                    low_price: today.low_price,
                    latest_price: today.latest_price,
                    change_pct: today.open_price
                        ? (((today.latest_price - today.open_price) / today.open_price) * 100).toFixed(2)
                        : null,
                } : null,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/market/yesterday
 * Returns yesterday's resolved ETH price data and outcome.
 */
router.get('/yesterday', async (_req: Request, res: Response) => {
    try {
        const yesterday = getYesterdayIST();
        let data: any = null;
        if (isNeonMarketStoreEnabled()) {
            data = await getNeonDaySnapshot(yesterday);
        }
        if (!data) {
            data = getDayPrice(yesterday) as any;
        }

        if (!data) {
            res.json({ success: true, data: null });
            return;
        }

        const changePct = data.open_price && data.close_price
            ? (((data.close_price - data.open_price) / data.open_price) * 100).toFixed(2)
            : null;

        res.json({
            success: true,
            data: {
                date: data.date,
                open_price: data.open_price,
                close_price: data.close_price ?? data.latest_price,
                high_price: data.high_price,
                low_price: data.low_price,
                change_pct: changePct,
                resolved: !!data.resolved,
                outcome: data.resolved_outcome,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
