import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tarotRoutes from './tarot/routes.js';
import authRoutes from './auth/routes.js';
import predictionRoutes from './predictions/routes.js';
import leaderboardRoutes from './leaderboard/routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'fatefi-api', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tarot', tarotRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ─── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🔮 FateFi API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Tarot:  http://localhost:${PORT}/api/tarot/today\n`);
});
