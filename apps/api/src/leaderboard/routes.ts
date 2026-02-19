import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authMiddleware } from '../auth/routes.js';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/leaderboard
 * Returns top users ranked by total points.
 */
router.get('/', (_req: Request, res: Response) => {
    try {
        const db = getDb();

        const leaders = db.prepare(`
      SELECT
        u.id,
        u.wallet_address,
        u.username,
        u.total_points,
        u.current_streak,
        u.longest_streak,
        COUNT(p.id) as total_predictions,
        ROUND(
          CASE WHEN COUNT(p.id) > 0
            THEN (SUM(CASE WHEN p.result = 'correct' THEN 1 ELSE 0 END) * 100.0 / COUNT(p.id))
            ELSE 0
          END, 1
        ) as accuracy_pct
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id AND p.result != 'pending'
      GROUP BY u.id
      ORDER BY u.total_points DESC, accuracy_pct DESC
      LIMIT 100
    `).all();

        const ranked = leaders.map((entry: any, index: number) => ({
            rank: index + 1,
            ...entry,
        }));

        res.json({ success: true, data: ranked });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
