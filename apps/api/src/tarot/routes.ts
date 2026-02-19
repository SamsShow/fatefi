import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { drawCardForDate } from './deck.js';
import { getInterpretation } from '../ai/service.js';
import { authMiddleware } from '../auth/routes.js';
import { getISTDate } from '../market/ethPrice.js';

const router: ReturnType<typeof Router> = Router();
router.use(authMiddleware);

function getTodayDate(): string {
    return getISTDate();
}

/**
 * GET /api/tarot/today
 * Returns today's tarot draw. Creates one if it doesn't exist yet.
 */
router.get('/today', async (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const today = getTodayDate();

        let draw = db.prepare('SELECT * FROM tarot_draws WHERE date = ?').get(today) as any;

        if (!draw) {
            const { card, orientation } = drawCardForDate(today);
            const stmt = db.prepare(
                'INSERT INTO tarot_draws (card_name, orientation, date) VALUES (?, ?, ?)'
            );
            const result = stmt.run(card.name, orientation, today);
            draw = db.prepare('SELECT * FROM tarot_draws WHERE id = ?').get(result.lastInsertRowid);
        }

        // Generate or retrieve AI interpretation
        if (!draw.ai_interpretation) {
            try {
                const interpretation = await getInterpretation(draw.card_name, draw.orientation);
                db.prepare('UPDATE tarot_draws SET ai_interpretation = ? WHERE id = ?').run(
                    JSON.stringify(interpretation),
                    draw.id
                );
                draw.ai_interpretation = JSON.stringify(interpretation);
            } catch (err) {
                console.error('AI interpretation failed, using fallback:', err);
            }
        }

        res.json({
            success: true,
            data: {
                ...draw,
                ai_interpretation: draw.ai_interpretation ? JSON.parse(draw.ai_interpretation) : null,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/tarot/history
 * Returns the last 30 tarot draws.
 */
router.get('/history', (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const draws = db
            .prepare('SELECT * FROM tarot_draws ORDER BY date DESC LIMIT 30')
            .all()
            .map((d: any) => ({
                ...d,
                ai_interpretation: d.ai_interpretation ? JSON.parse(d.ai_interpretation) : null,
            }));
        res.json({ success: true, data: draws });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
