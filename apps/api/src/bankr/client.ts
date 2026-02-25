/**
 * Bankr Bot — Bankr Agent API Client
 * Uses the Bankr Agent API (api.bankr.bot) for both chat and on-chain actions.
 * Flow: POST /agent/prompt → poll GET /agent/job/:jobId → result
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

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    response: string;
    jobId: string;
    status: string;
}

// ─── Chat via Bankr Agent API ───────────────────────────

/**
 * Send a chat prompt to the Bankr Agent API and poll until completion.
 * The agent can answer crypto questions, check prices, and execute actions.
 */
export async function chatViaAgent(prompt: string): Promise<ChatResponse> {
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
            return {
                response: job.response || 'Done.',
                jobId,
                status: 'completed',
            };
        }
        if (job.status === 'failed' || job.status === 'cancelled') {
            return {
                response: job.error || job.response || `Request ${job.status}`,
                jobId,
                status: job.status,
            };
        }
        // pending / processing → keep polling
    }

    return {
        response: 'Request timed out. Please try again.',
        jobId,
        status: 'timeout',
    };
}
