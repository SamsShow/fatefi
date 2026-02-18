import { getDb } from '../db/schema.js';

const POINTS_CORRECT = 10;
const STREAK_BONUS = 2; // extra points per streak length

/**
 * Score a prediction and update user stats.
 */
export function scorePrediction(predictionId: number, isCorrect: boolean) {
    const db = getDb();
    const prediction = db.prepare('SELECT * FROM predictions WHERE id = ?').get(predictionId) as any;
    if (!prediction || prediction.result !== 'pending') return;

    const result = isCorrect ? 'correct' : 'incorrect';
    const score = isCorrect ? POINTS_CORRECT : 0;

    db.prepare('UPDATE predictions SET result = ?, score = ? WHERE id = ?').run(result, score, predictionId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(prediction.user_id) as any;
    if (!user) return;

    if (isCorrect) {
        const newStreak = user.current_streak + 1;
        const longestStreak = Math.max(newStreak, user.longest_streak);
        const streakBonus = newStreak * STREAK_BONUS;
        const totalPoints = user.total_points + score + streakBonus;

        db.prepare(
            'UPDATE users SET total_points = ?, current_streak = ?, longest_streak = ? WHERE id = ?'
        ).run(totalPoints, newStreak, longestStreak, user.id);
    } else {
        db.prepare(
            'UPDATE users SET current_streak = 0 WHERE id = ?'
        ).run(user.id);
    }
}

/**
 * Batch-resolve all pending predictions for a given draw.
 * correctOption is the "winning" option (e.g. 'bullish').
 */
export function resolveDrawPredictions(drawId: number, correctOption: string) {
    const db = getDb();
    const predictions = db.prepare(
        'SELECT * FROM predictions WHERE tarot_draw_id = ? AND result = \'pending\''
    ).all() as any[];

    for (const pred of predictions) {
        scorePrediction(pred.id, pred.selected_option === correctOption);
    }
}
