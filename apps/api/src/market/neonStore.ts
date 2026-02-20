import { neon } from '@neondatabase/serverless';

export interface MarketSnapshot {
    date: string;
    open_price: number | null;
    close_price: number | null;
    high_price: number | null;
    low_price: number | null;
    latest_price: number | null;
    resolved: boolean;
    resolved_outcome: string | null;
}

let client: ReturnType<typeof neon> | null = null;
let schemaInitPromise: Promise<void> | null = null;

function getClient(): ReturnType<typeof neon> | null {
    const url = process.env.NEON_DATABASE_URL;
    if (!url) return null;
    if (!client) client = neon(url);
    return client;
}

async function ensureSchema(): Promise<void> {
    if (schemaInitPromise) {
        await schemaInitPromise;
        return;
    }

    const sql = getClient();
    if (!sql) return;

    schemaInitPromise = (async () => {
        await sql`
            CREATE TABLE IF NOT EXISTS market_day_snapshots (
                date text PRIMARY KEY,
                open_price double precision,
                close_price double precision,
                high_price double precision,
                low_price double precision,
                latest_price double precision,
                resolved boolean DEFAULT false,
                resolved_outcome text,
                source text DEFAULT 'fatefi-api',
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            )
        `;
    })();

    await schemaInitPromise;
}

export function isNeonMarketStoreEnabled(): boolean {
    return Boolean(process.env.NEON_DATABASE_URL);
}

export async function upsertNeonMarketSnapshot(snapshot: MarketSnapshot): Promise<void> {
    const sql = getClient();
    if (!sql) return;

    try {
        await ensureSchema();
        await sql`
            INSERT INTO market_day_snapshots (
                date,
                open_price,
                close_price,
                high_price,
                low_price,
                latest_price,
                resolved,
                resolved_outcome,
                updated_at
            ) VALUES (
                ${snapshot.date},
                ${snapshot.open_price},
                ${snapshot.close_price},
                ${snapshot.high_price},
                ${snapshot.low_price},
                ${snapshot.latest_price},
                ${snapshot.resolved},
                ${snapshot.resolved_outcome},
                now()
            )
            ON CONFLICT (date) DO UPDATE SET
                open_price = EXCLUDED.open_price,
                close_price = EXCLUDED.close_price,
                high_price = EXCLUDED.high_price,
                low_price = EXCLUDED.low_price,
                latest_price = EXCLUDED.latest_price,
                resolved = EXCLUDED.resolved,
                resolved_outcome = EXCLUDED.resolved_outcome,
                updated_at = now()
        `;
    } catch (err: any) {
        const cause = err?.cause ? ` (cause: ${err.cause?.message ?? err.cause})` : '';
        console.warn('[Neon] Failed to upsert market snapshot:', err.message + cause);
    }
}

export async function getNeonDaySnapshot(date: string): Promise<MarketSnapshot | null> {
    const sql = getClient();
    if (!sql) return null;

    try {
        await ensureSchema();
        const rows = await sql`
            SELECT
                date,
                open_price,
                close_price,
                high_price,
                low_price,
                latest_price,
                resolved,
                resolved_outcome
            FROM market_day_snapshots
            WHERE date = ${date}
            LIMIT 1
        `;
        return ((rows as any[])[0] as MarketSnapshot | undefined) ?? null;
    } catch (err: any) {
        const cause = err?.cause ? ` (cause: ${err.cause?.message ?? err.cause})` : '';
        console.warn('[Neon] Failed to fetch market snapshot:', err.message + cause);
        return null;
    }
}
