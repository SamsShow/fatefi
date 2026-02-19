import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router: ReturnType<typeof Router> = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fatefi-dev-secret';

/**
 * GET /api/auth/nonce?address=0x...
 * Returns a nonce for the wallet to sign.
 */
router.get('/nonce', (req: Request, res: Response) => {
    try {
        const address = (req.query.address as string)?.toLowerCase();
        if (!address) {
            res.status(400).json({ success: false, error: 'address query param required' });
            return;
        }

        const db = getDb();
        const nonce = uuidv4();

        db.prepare(
            'INSERT INTO nonces (wallet_address, nonce) VALUES (?, ?) ON CONFLICT(wallet_address) DO UPDATE SET nonce = ?, created_at = datetime(\'now\')'
        ).run(address, nonce, nonce);

        res.json({
            success: true,
            data: {
                nonce,
                message: `Sign this message to authenticate with FateFi:\n\nNonce: ${nonce}`,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/auth/verify
 * Verifies a signed message and returns a JWT.
 * Body: { address, signature }
 */
router.post('/verify', (req: Request, res: Response) => {
    try {
        const { address, signature } = req.body;
        if (!address || !signature) {
            res.status(400).json({ success: false, error: 'address and signature required' });
            return;
        }

        const lowerAddress = address.toLowerCase();
        const db = getDb();

        const nonceRow = db.prepare('SELECT nonce FROM nonces WHERE wallet_address = ?').get(lowerAddress) as any;
        if (!nonceRow) {
            res.status(400).json({ success: false, error: 'No nonce found. Request /nonce first.' });
            return;
        }

        const message = `Sign this message to authenticate with FateFi:\n\nNonce: ${nonceRow.nonce}`;
        const recoveredAddress = verifyMessage(message, signature).toLowerCase();

        if (recoveredAddress !== lowerAddress) {
            res.status(401).json({ success: false, error: 'Signature verification failed' });
            return;
        }

        // Delete used nonce
        db.prepare('DELETE FROM nonces WHERE wallet_address = ?').run(lowerAddress);

        // Create or get user
        db.prepare(
            'INSERT OR IGNORE INTO users (wallet_address) VALUES (?)'
        ).run(lowerAddress);

        const user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(lowerAddress) as any;

        const token = jwt.sign(
            { userId: user.id, wallet: user.wallet_address },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: { token, user },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * JWT auth middleware
 */
export function authMiddleware(req: Request, res: Response, next: Function) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'No token provided' });
        return;
    }

    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET) as any;
        (req as any).userId = payload.userId;
        (req as any).wallet = payload.wallet;
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
}

/**
 * GET /api/auth/me — get current user info
 */
router.get('/me', authMiddleware, (req: Request, res: Response) => {
    try {
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get((req as any).userId);
        res.json({ success: true, data: user });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
