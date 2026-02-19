import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tarotRoutes from './tarot/routes.js';
import authRoutes from './auth/routes.js';
import predictionRoutes from './predictions/routes.js';
import leaderboardRoutes from './leaderboard/routes.js';
import marketRoutes from './market/routes.js';
import { startScheduler } from './market/scheduler.js';
import { isNeonMarketStoreEnabled } from './market/neonStore.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────
const corsOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
];
app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (corsOrigins.includes(origin)) return cb(null, true);
            if (origin.endsWith('.vercel.app')) return cb(null, true);
            cb(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
        optionsSuccessStatus: 204,
    })
);
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
app.use('/api/market', marketRoutes);

// ─── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🔮 FateFi API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Tarot:  http://localhost:${PORT}/api/tarot/today`);
    console.log(`   Market: http://localhost:${PORT}/api/market/price\n`);
    console.log(`   Neon market store: ${isNeonMarketStoreEnabled() ? 'enabled' : 'disabled'}\n`);

    // Start ETH price tracker & daily resolver
    startScheduler();
});
