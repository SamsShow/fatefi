// ─── Tarot ───────────────────────────────────────────────
export interface TarotCard {
    name: string;
    arcana: 'major' | 'minor';
    suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
    number: number;
    keywords: string[];
}

export type Orientation = 'upright' | 'reversed';

export interface TarotDraw {
    id: number;
    card_name: string;
    orientation: Orientation;
    date: string; // YYYY-MM-DD
    ai_interpretation?: string;
}

// ─── Prediction ──────────────────────────────────────────
export type PredictionType = 'direction' | 'volatility' | 'memecoin_pump';
export type DirectionOption = 'bullish' | 'bearish';
export type VolatilityOption = 'high' | 'low';
export type PumpOption = 'pump' | 'dump';
export type PredictionOption = DirectionOption | VolatilityOption | PumpOption;

export interface Prediction {
    id: number;
    user_id: number;
    tarot_draw_id: number;
    prediction_type: PredictionType;
    selected_option: PredictionOption;
    result?: 'correct' | 'incorrect' | 'pending';
    score: number;
    timestamp: string;
}

// ─── User ────────────────────────────────────────────────
export interface User {
    id: number;
    wallet_address: string;
    username?: string;
    created_at: string;
    total_points: number;
    current_streak: number;
    longest_streak: number;
}

// ─── Leaderboard ─────────────────────────────────────────
export interface LeaderboardEntry {
    rank: number;
    wallet_address: string;
    username?: string;
    total_points: number;
    accuracy_pct: number;
    current_streak: number;
    longest_streak: number;
    total_predictions: number;
}

// ─── AI ──────────────────────────────────────────────────
export interface AIInterpretation {
    prediction: string;
    narrative: string;
    confidence_tone: string;
    disclaimer: string;
}

// ─── API Responses ───────────────────────────────────────
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
