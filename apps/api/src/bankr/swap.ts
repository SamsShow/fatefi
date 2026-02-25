/**
 * Bankr Swap Client
 * Uses the Bankr Agent REST API for on-chain swap execution on Base.
 *
 * Flow: POST /agent/prompt (with swap instruction) → poll GET /agent/job/:jobId → result
 * Auth: X-API-Key header with a key starting with bk_
 */

const BANKR_BASE = 'https://api.bankr.bot';

function getApiKey(): string {
    const key = process.env.BANKR_API_KEY;
    if (!key) throw new Error('BANKR_API_KEY is not set — get one at bankr.bot/api');
    return key;
}

function headers(): Record<string, string> {
    return {
        'X-API-Key': getApiKey(),
        'Content-Type': 'application/json',
    };
}

// ─── Types ──────────────────────────────────────────────

export interface BankrTransaction {
    type: string;
    metadata: {
        chainId?: number;
        to?: string;
        data?: string;
        value?: string;
        gas?: string;
        gasPrice?: string;
        transaction?: {
            chainId?: number;
            to?: string;
            data?: string;
            value?: string;
            gas?: string;
            gasPrice?: string;
        };
        __ORIGINAL_TX_DATA__?: any;
        [key: string]: any;
    };
}

export interface SwapResult {
    status: 'completed' | 'failed' | 'cancelled' | 'timeout';
    response: string;
    jobId: string;
    transactions: BankrTransaction[];
}

// ─── API Methods ────────────────────────────────────────

/**
 * Submit a swap prompt to the Bankr agent and poll until completion.
 * The agent handles quote fetching, approval, and execution.
 */
export async function executeSwap(prompt: string): Promise<SwapResult> {
    // 1. Submit the prompt
    const submitRes = await fetch(`${BANKR_BASE}/agent/prompt`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ prompt }),
    });

    if (!submitRes.ok) {
        const body = await submitRes.text();
        throw new Error(`Bankr prompt failed (${submitRes.status}): ${body}`);
    }

    const { jobId } = await submitRes.json();
    if (!jobId) throw new Error('No jobId returned from Bankr');

    // 2. Poll for result (max 2 minutes)
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const pollRes = await fetch(`${BANKR_BASE}/agent/job/${encodeURIComponent(jobId)}`, {
            headers: headers(),
        });

        if (!pollRes.ok) {
            const body = await pollRes.text();
            throw new Error(`Bankr poll failed (${pollRes.status}): ${body}`);
        }

        const job = await pollRes.json();

        if (job.status === 'completed') {
            // Extract transactions array for wallet-mode execution
            const transactions: BankrTransaction[] = job.transactions || job.richData || [];
            return { status: 'completed', response: job.response || 'Swap planned.', jobId, transactions };
        }
        if (job.status === 'failed' || job.status === 'cancelled') {
            return { status: job.status, response: job.error || job.response || `Swap ${job.status}`, jobId, transactions: [] };
        }
        // pending / processing → keep polling
    }

    return { status: 'timeout', response: 'Swap request timed out. Please try again.', jobId, transactions: [] };
}

/**
 * Get the Bankr agent's account info and balances.
 */
export async function getAgentInfo(): Promise<any> {
    const res = await fetch(`${BANKR_BASE}/agent/balances`, {
        headers: headers(),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Bankr balances fetch failed (${res.status}): ${body}`);
    }

    return res.json();
}
