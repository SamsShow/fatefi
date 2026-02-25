import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../auth/routes.js';
import { chatViaAgent } from './client.js';
import { executeSwap, getAgentInfo } from './swap.js';

const router: Router = Router();
router.use(authMiddleware);

/**
 * POST /api/bankr/chat
 * Send a message to the Bankr Agent API.
 * Body: { message: string }
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ success: false, error: 'Missing or invalid "message" field' });
            return;
        }

        const result = await chatViaAgent(message.trim());
        res.json({ success: true, data: result });
    } catch (err: any) {
        console.error('[bankr] chat error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/bankr/swap
 * Execute an on-chain swap via the Bankr Agent API.
 * Body: { prompt: string }  — e.g. "Swap 0.01 ETH for USDC on Base"
 */
router.post('/swap', async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ success: false, error: 'Missing or invalid "prompt" field' });
            return;
        }

        console.log('[bankr] swap request:', prompt);
        const result = await executeSwap(prompt.trim());
        console.log('[bankr] swap result:', result.status, result.jobId);

        res.json({ success: true, data: result });
    } catch (err: any) {
        console.error('[bankr] swap error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/bankr/agent
 * Get Bankr agent account info (wallets, balances).
 */
router.get('/agent', async (_req: Request, res: Response) => {
    try {
        const info = await getAgentInfo();
        res.json({ success: true, data: info });
    } catch (err: any) {
        console.error('[bankr] agent info error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
