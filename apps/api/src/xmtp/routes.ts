import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth/routes.js';
import { getDb } from '../db/schema.js';

const router: ReturnType<typeof Router> = Router();
router.use(authMiddleware);

router.get('/status', (req: Request, res: Response) => {
    try {
        const wallet = String((req as any).wallet || '').toLowerCase();
        const db = getDb();

        const row = db
            .prepare('SELECT subscribed FROM xmtp_subscriptions WHERE wallet_address = ?')
            .get(wallet) as { subscribed: number } | undefined;

        res.json({
            success: true,
            data: { subscribed: !!row?.subscribed },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/subscribe', (req: Request, res: Response) => {
    try {
        const wallet = String((req as any).wallet || '').toLowerCase();
        const db = getDb();

        db.prepare(
            `
            INSERT INTO xmtp_subscriptions (wallet_address, subscribed, subscribed_at, unsubscribed_at, updated_at)
            VALUES (?, 1, datetime('now'), NULL, datetime('now'))
            ON CONFLICT(wallet_address) DO UPDATE SET
                subscribed = 1,
                subscribed_at = datetime('now'),
                unsubscribed_at = NULL,
                updated_at = datetime('now')
            `
        ).run(wallet);

        res.json({ success: true, data: { subscribed: true } });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/unsubscribe', (req: Request, res: Response) => {
    try {
        const wallet = String((req as any).wallet || '').toLowerCase();
        const db = getDb();

        db.prepare(
            `
            INSERT INTO xmtp_subscriptions (wallet_address, subscribed, unsubscribed_at, updated_at)
            VALUES (?, 0, datetime('now'), datetime('now'))
            ON CONFLICT(wallet_address) DO UPDATE SET
                subscribed = 0,
                unsubscribed_at = datetime('now'),
                updated_at = datetime('now')
            `
        ).run(wallet);

        res.json({ success: true, data: { subscribed: false } });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/inbox-preview', (req: Request, res: Response) => {
    try {
        const wallet = String((req as any).wallet || '').toLowerCase();
        const db = getDb();

        const rows = db
            .prepare(
                `
                SELECT id, card_name, orientation, date, message_text, sent_at
                FROM xmtp_messages
                WHERE wallet_address = ?
                ORDER BY sent_at DESC
                LIMIT 10
                `
            )
            .all(wallet);

        res.json({ success: true, data: rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
