import { Wallet, getBytes, id } from 'ethers';
import { FULL_DECK, drawCardForDate } from '../tarot/deck.js';
import { getDb } from '../db/schema.js';

type Orientation = ReturnType<typeof drawCardForDate>['orientation'];

type XmtpIdentifier = { identifier: string; identifierKind: unknown };
type XmtpSigner = {
    type: 'EOA';
    getIdentifier: () => XmtpIdentifier;
    signMessage: (message: string) => Promise<Uint8Array>;
};
type XmtpClientLike = {
    fetchInboxIdByIdentifier: (identifier: XmtpIdentifier) => Promise<string | null>;
    conversations: {
        createDmWithIdentifier: (identifier: XmtpIdentifier) => Promise<{ sendText: (message: string) => Promise<unknown> }>;
    };
};
type XmtpSdkLike = {
    Client: {
        create: (signer: XmtpSigner, options: Record<string, unknown>) => Promise<XmtpClientLike>;
    };
    IdentifierKind: {
        Ethereum: unknown;
    };
};

let xmtpClientPromise: Promise<XmtpClientLike> | null = null;
let xmtpSdkPromise: Promise<XmtpSdkLike> | null = null;

const MAJOR_ARCANA_MAP: Record<string, number> = {
    'The Fool': 0,
    'The Magician': 1,
    'The High Priestess': 2,
    'The Empress': 3,
    'The Emperor': 4,
    'The Hierophant': 5,
    'The Lovers': 6,
    'The Chariot': 7,
    Strength: 8,
    'The Hermit': 9,
    'Wheel of Fortune': 10,
    Justice: 11,
    'The Hanged Man': 12,
    Death: 13,
    Temperance: 14,
    'The Devil': 15,
    'The Tower': 16,
    'The Star': 17,
    'The Moon': 18,
    'The Sun': 19,
    Judgement: 20,
    'The World': 21,
};

const COURT_NAMES = ['page', 'knight', 'queen', 'king'];

function getDbEncryptionKey(): Uint8Array {
    const configured = process.env.XMTP_DB_ENCRYPTION_KEY;
    if (configured && configured.trim()) {
        const hex = configured.startsWith('0x') ? configured : `0x${configured}`;
        return getBytes(hex);
    }

    const privateKey = process.env.XMTP_BROADCASTER_PRIVATE_KEY || '';
    if (!privateKey) {
        throw new Error('XMTP_BROADCASTER_PRIVATE_KEY is missing');
    }
    return getBytes(id(privateKey));
}

async function getXmtpSdk(): Promise<XmtpSdkLike> {
    if (!xmtpSdkPromise) {
        xmtpSdkPromise = import('@xmtp/node-sdk') as Promise<XmtpSdkLike>;
    }
    return xmtpSdkPromise;
}

async function buildSigner(): Promise<XmtpSigner> {
    const privateKey = process.env.XMTP_BROADCASTER_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('XMTP_BROADCASTER_PRIVATE_KEY is missing');
    }

    const sdk = await getXmtpSdk();
    const wallet = new Wallet(privateKey);

    return {
        type: 'EOA',
        getIdentifier: () => ({
            identifier: wallet.address,
            identifierKind: sdk.IdentifierKind.Ethereum,
        }),
        signMessage: async (message: string) => {
            const signatureHex = await wallet.signMessage(message);
            return getBytes(signatureHex);
        },
    };
}

async function getXmtpClient(): Promise<XmtpClientLike> {
    if (!xmtpClientPromise) {
        const sdk = await getXmtpSdk();
        const signer = await buildSigner();
        xmtpClientPromise = sdk.Client.create(signer, {
            env: (process.env.XMTP_ENV as 'local' | 'dev' | 'production' | undefined) || 'dev',
            dbEncryptionKey: getDbEncryptionKey(),
            dbPath: process.env.XMTP_DB_PATH || './xmtp-broadcaster.db3',
        });
    }
    return xmtpClientPromise;
}

function getCardImagePath(cardName: string): string {
    if (cardName in MAJOR_ARCANA_MAP) {
        return `/tarot/major/${MAJOR_ARCANA_MAP[cardName]}.png`;
    }

    const match = cardName.match(/^(.+)\s+of\s+(\w+)$/i);
    if (!match) return '/tarot/major/0.png';

    const [, rank, suit] = match;
    const suitLower = suit.toLowerCase();

    const courtIndex = COURT_NAMES.indexOf(rank.toLowerCase());
    if (courtIndex !== -1) {
        return `/tarot/${suitLower}/${COURT_NAMES[courtIndex]}.png`;
    }

    const num = rank.toLowerCase() === 'ace' ? 1 : parseInt(rank, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 10) {
        return `/tarot/${suitLower}/${num}.png`;
    }

    return '/tarot/major/0.png';
}

function getMeaning(cardName: string, orientation: Orientation): string {
    const card = FULL_DECK.find((entry) => entry.name === cardName);
    const keywords = card?.keywords?.join(', ') || 'intuition, reflection, awareness';

    if (orientation === 'upright') {
        return `Upright energy: ${keywords}.`;
    }

    return `Reversed energy: blocked or internalized ${keywords}.`;
}

function buildBroadcastMessage(date: string, cardName: string, orientation: Orientation): string {
    const webBase = (process.env.WEB_BASE_URL || 'https://fatefi.fun').replace(/\/$/, '');
    const imageUrl = `${webBase}${getCardImagePath(cardName)}`;
    const meaning = getMeaning(cardName, orientation);

    return [
        '🗞️ FateFi Card of the Day',
        `Date (IST): ${date}`,
        `Card: ${cardName} (${orientation})`,
        `Meaning: ${meaning}`,
        `Image: ${imageUrl}`,
    ].join('\n');
}

async function toIdentifier(walletAddress: string): Promise<XmtpIdentifier> {
    const sdk = await getXmtpSdk();
    return {
        identifier: walletAddress.toLowerCase(),
        identifierKind: sdk.IdentifierKind.Ethereum,
    };
}

async function ensureInboxExists(client: XmtpClientLike, walletAddress: string): Promise<string> {
    const identifier = await toIdentifier(walletAddress);
    const inboxId = await client.fetchInboxIdByIdentifier(identifier);
    if (!inboxId) {
        const env = process.env.XMTP_ENV || 'dev';
        throw new Error(
            `XMTP inbox not found for ${walletAddress} on env=${env}. Open an XMTP-enabled app with this wallet first, and use XMTP_ENV=production for real wallets.`
        );
    }
    return inboxId;
}

function logMessageForPreview(params: {
    walletAddress: string;
    date: string;
    cardName: string;
    orientation: Orientation;
    messageText: string;
}) {
    const { walletAddress, date, cardName, orientation, messageText } = params;
    const db = getDb();
    db.prepare(
        `
        INSERT INTO xmtp_messages (wallet_address, card_name, orientation, date, message_text)
        VALUES (?, ?, ?, ?, ?)
        `
    ).run(walletAddress.toLowerCase(), cardName, orientation, date, messageText);
}

export async function broadcastDailyDraw(params: {
    date: string;
    cardName: string;
    orientation: Orientation;
}) {
    const { date, cardName, orientation } = params;

    if (!process.env.XMTP_BROADCASTER_PRIVATE_KEY) {
        console.warn('[XMTP] Broadcast skipped: XMTP_BROADCASTER_PRIVATE_KEY not configured');
        return;
    }

    const db = getDb();
    const subscribers = db
        .prepare('SELECT wallet_address FROM xmtp_subscriptions WHERE subscribed = 1 ORDER BY id ASC')
        .all() as Array<{ wallet_address: string }>;

    if (subscribers.length === 0) {
        console.log('[XMTP] Broadcast skipped: no subscribed wallets');
        return;
    }

    const client = await getXmtpClient();
    const message = buildBroadcastMessage(date, cardName, orientation);

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
        try {
            await ensureInboxExists(client, subscriber.wallet_address);
            const dm = await client.conversations.createDmWithIdentifier(await toIdentifier(subscriber.wallet_address));
            await dm.sendText(message);
            logMessageForPreview({
                walletAddress: subscriber.wallet_address,
                date,
                cardName,
                orientation,
                messageText: message,
            });
            sent += 1;
        } catch (err: any) {
            failed += 1;
            console.error(`[XMTP] Failed to send to ${subscriber.wallet_address}:`, err?.message || err);
        }
    }

    console.log(`[XMTP] Daily draw broadcast complete for ${date}. sent=${sent} failed=${failed}`);
}
