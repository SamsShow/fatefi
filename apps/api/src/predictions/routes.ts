import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authMiddleware } from '../auth/routes.js';

const router = Router();

/**
 * POST /api/predictions
 * Submit a prediction for today's tarot draw. Auth required.
 * Body: { prediction_type, selected_option }
 */
router.post('/', authMiddleware, (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { prediction_type = 'direction', selected_option } = req.body;

        if (!selected_option) {
            res.status(400).json({ success: false, error: 'selected_option is required' });
            return;
        }

        const validOptions = ['bullish', 'bearish', 'high', 'low', 'pump', 'dump'];
        if (!validOptions.includes(selected_option)) {
            res.status(400).json({ success: false, error: `Invalid option. Must be one of: ${validOptions.join(', ')}` });
            return;
        }

        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        // Get today's tarot draw
        const draw = db.prepare('SELECT id FROM tarot_draws WHERE date = ?').get(today) as any;
        if (!draw) {
            res.status(400).json({ success: false, error: 'No tarot draw for today. Visit /api/tarot/today first.' });
            return;
        }

        // Check for duplicate
        const existing = db.prepare(
            'SELECT id FROM predictions WHERE user_id = ? AND tarot_draw_id = ?'
        ).get(userId, draw.id);

        if (existing) {
            res.status(409).json({ success: false, error: 'You already submitted a prediction for today.' });
            return;
        }

        const stmt = db.prepare(
            'INSERT INTO predictions (user_id, tarot_draw_id, prediction_type, selected_option) VALUES (?, ?, ?, ?)'
        );
        const result = stmt.run(userId, draw.id, prediction_type, selected_option);

        const prediction = db.prepare('SELECT * FROM predictions WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ success: true, data: prediction });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/predictions/mine
 * Get current user's prediction history. Auth required.
 */
router.get('/mine', authMiddleware, (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const db = getDb();

        const predictions = db.prepare(`
      SELECT p.*, td.card_name, td.orientation, td.date as draw_date
      FROM predictions p
      JOIN tarot_draws td ON td.id = p.tarot_draw_id
      WHERE p.user_id = ?
      ORDER BY p.timestamp DESC
      LIMIT 50
    `).all(userId);

        res.json({ success: true, data: predictions });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/predictions/today
 * Check if user already predicted today. Auth required.
 */
router.get('/today', authMiddleware, (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        const draw = db.prepare('SELECT id FROM tarot_draws WHERE date = ?').get(today) as any;
        if (!draw) {
            res.json({ success: true, data: null });
            return;
        }

        const prediction = db.prepare(
            'SELECT * FROM predictions WHERE user_id = ? AND tarot_draw_id = ?'
        ).get(userId, draw.id);

        res.json({ success: true, data: prediction || null });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
