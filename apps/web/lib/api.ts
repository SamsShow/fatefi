const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fatefi_token');
}

function getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Skip ngrok's "Visit Site" interstitial (returns HTML instead of JSON)
    if (API_BASE.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';
    return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: { ...getHeaders(), ...options?.headers },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'API error');
        return data.data;
    } catch (err: any) {
        if (err.message === 'Failed to fetch' || err.code === 'ECONNREFUSED') {
            throw new Error('Cannot connect to server. Is the local API running?');
        }
        throw err;
    }
}

// ─── Auth ────────────────────────────────────────────────
export async function getNonce(address: string) {
    return request<{ nonce: string; message: string }>(`/auth/nonce?address=${address}`);
}

export async function verifySignature(address: string, signature: string) {
    return request<{ token: string; user: any }>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ address, signature }),
    });
}

export async function getMe() {
    return request<any>('/auth/me');
}

// ─── Tarot ───────────────────────────────────────────────
export async function getTodayDraw() {
    return request<any>('/tarot/today');
}

export async function getTarotHistory() {
    return request<any[]>('/tarot/history');
}

// ─── Predictions ─────────────────────────────────────────
export async function submitPrediction(predictionType: string, selectedOption: string) {
    return request<any>('/predictions', {
        method: 'POST',
        body: JSON.stringify({ prediction_type: predictionType, selected_option: selectedOption }),
    });
}

export async function getMyPredictions() {
    return request<any[]>('/predictions/mine');
}

export async function getTodayPrediction() {
    return request<any | null>('/predictions/today');
}

// ─── Leaderboard ─────────────────────────────────────────
export async function getLeaderboard() {
    return request<any[]>('/leaderboard');
}

// ─── Market ──────────────────────────────────────────────
export async function getEthPrice() {
    return request<any>('/market/price');
}

export async function getYesterdayResult() {
    return request<any>('/market/yesterday');
}

export async function getPoolStats() {
    return request<any>('/market/pool');
}
