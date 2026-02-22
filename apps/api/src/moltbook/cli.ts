import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { drawCardForDate } from '../tarot/deck.js';
import { getInterpretation } from '../ai/service.js';

const MOLTBOOK_BASE = process.env.MOLTBOOK_BASE_URL || 'https://www.moltbook.com/api/v1';
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || '';
const MOLTBOOK_AGENT_NAME = process.env.MOLTBOOK_AGENT_NAME || 'FateFiOracle';
const MOLTBOOK_AGENT_DESCRIPTION =
    process.env.MOLTBOOK_AGENT_DESCRIPTION ||
    'FateFi oracle agent: tarot-based ETH market vibes generated with local OpenClaw.';
const MOLTBOOK_SUBMOLT = process.env.MOLTBOOK_SUBMOLT || 'general';

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string; args: Args } {
    const [command = 'help', ...rest] = argv;
    const args: Args = {};

    for (let i = 0; i < rest.length; i++) {
        const token = rest[i];
        if (token === '--') continue;
        if (!token.startsWith('--')) continue;

        const key = token.slice(2);
        const next = rest[i + 1];
        if (!next || next.startsWith('--')) {
            args[key] = true;
            continue;
        }

        args[key] = next;
        i += 1;
    }

    return { command, args };
}

function getStringArg(args: Args, key: string, fallback = ''): string {
    const value = args[key];
    if (typeof value === 'string') return value;
    return fallback;
}

function authHeaders() {
    if (!MOLTBOOK_API_KEY) {
        throw new Error('Missing MOLTBOOK_API_KEY in environment.');
    }

    return {
        Authorization: `Bearer ${MOLTBOOK_API_KEY}`,
    };
}

async function saveCredentials(apiKey: string, agentName: string) {
    const dir = join(homedir(), '.config', 'moltbook');
    const filePath = join(dir, 'credentials.json');
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify({ api_key: apiKey, agent_name: agentName }, null, 2), 'utf-8');
    console.log(`Saved credentials to ${filePath}`);
}

async function registerAgent(args: Args) {
    const name = getStringArg(args, 'name', MOLTBOOK_AGENT_NAME);
    const description = getStringArg(args, 'description', MOLTBOOK_AGENT_DESCRIPTION);

    const response = await fetch(`${MOLTBOOK_BASE}/agents/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Register failed (${response.status}): ${JSON.stringify(data)}`);
    }

    const agent = data?.agent;
    if (!agent?.api_key) {
        throw new Error('Register succeeded but no api_key was returned.');
    }

    console.log('\n✅ Agent registered on Moltbook');
    console.log(`Name: ${name}`);
    console.log(`Claim URL: ${agent.claim_url}`);
    console.log(`Verification Code: ${agent.verification_code}`);
    console.log('\nAdd this to your env:');
    console.log(`MOLTBOOK_API_KEY=${agent.api_key}`);

    await saveCredentials(agent.api_key, name);
}

async function status() {
    const response = await fetch(`${MOLTBOOK_BASE}/agents/status`, {
        headers: {
            ...authHeaders(),
        },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Status failed (${response.status}): ${JSON.stringify(data)}`);
    }

    console.log(JSON.stringify(data, null, 2));
}

async function me() {
    const response = await fetch(`${MOLTBOOK_BASE}/agents/me`, {
        headers: {
            ...authHeaders(),
        },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Profile fetch failed (${response.status}): ${JSON.stringify(data)}`);
    }

    console.log(JSON.stringify(data, null, 2));
}

function buildTarotPostContent(date: string, cardName: string, orientation: string, interpretation: Awaited<ReturnType<typeof getInterpretation>>) {
    const lines = [
        `🔮 FateFi Daily Reading (${date})`,
        '',
        `Card: ${cardName} (${orientation})`,
        '',
        `Prediction: ${interpretation.prediction}`,
        '',
        `Narrative: ${interpretation.narrative}`,
    ];

    if (interpretation.market_mood) {
        lines.push('', `Market mood: ${interpretation.market_mood}`);
    }
    if (interpretation.key_levels) {
        lines.push('', `Key levels: ${interpretation.key_levels}`);
    }
    if (interpretation.cosmic_tip) {
        lines.push('', `Cosmic tip: ${interpretation.cosmic_tip}`);
    }

    lines.push('', interpretation.disclaimer);
    return lines.join('\n');
}

async function postDaily(args: Args) {
    const date = getStringArg(args, 'date', new Date().toISOString().slice(0, 10));
    const submolt = getStringArg(args, 'submolt', MOLTBOOK_SUBMOLT);
    const marketContext = getStringArg(args, 'market-context', process.env.MOLTBOOK_MARKET_CONTEXT || '');
    const title = getStringArg(args, 'title', `FateFi Daily Tarot: ${date}`);

    const { card, orientation } = drawCardForDate(date);
    const interpretation = await getInterpretation(card.name, orientation, marketContext || undefined);
    const content = buildTarotPostContent(date, card.name, orientation, interpretation);

    const response = await fetch(`${MOLTBOOK_BASE}/posts`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            submolt_name: submolt,
            title,
            content,
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Post failed (${response.status}): ${JSON.stringify(data)}`);
    }

    console.log('✅ Daily tarot post submitted.');
    console.log(JSON.stringify(data, null, 2));

    const verification = data?.post?.verification;
    if (verification?.verification_code) {
        console.log('\n⚠️ Verification required before post is visible.');
        console.log(`Code: ${verification.verification_code}`);
        console.log(`Challenge: ${verification.challenge_text}`);
        console.log('Submit with:');
        console.log('pnpm --filter @fatefi/api moltbook verify --code <verification_code> --answer <number>');
    }
}

async function verify(args: Args) {
    const verificationCode = getStringArg(args, 'code');
    const answer = getStringArg(args, 'answer');

    if (!verificationCode || !answer) {
        throw new Error('Usage: verify --code <verification_code> --answer <number>');
    }

    const response = await fetch(`${MOLTBOOK_BASE}/verify`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verification_code: verificationCode, answer }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Verify failed (${response.status}): ${JSON.stringify(data)}`);
    }

    console.log('✅ Verification submitted.');
    console.log(JSON.stringify(data, null, 2));
}

function printHelp() {
    console.log(`
FateFi Moltbook CLI

Commands:
  register [--name <name>] [--description <description>]
  status
  me
  post-daily [--date YYYY-MM-DD] [--submolt <name>] [--title <title>] [--market-context <text>]
  verify --code <verification_code> --answer <number>

Examples:
  pnpm --filter @fatefi/api moltbook register --name FateFiOracle
  pnpm --filter @fatefi/api moltbook status
  pnpm --filter @fatefi/api moltbook post-daily --submolt general
  pnpm --filter @fatefi/api moltbook verify --code moltbook_verify_abc --answer 15.00
`);
}

async function main() {
    const { command, args } = parseArgs(process.argv.slice(2));

    switch (command) {
        case 'register':
            await registerAgent(args);
            break;
        case 'status':
            await status();
            break;
        case 'me':
            await me();
            break;
        case 'post-daily':
            await postDaily(args);
            break;
        case 'verify':
            await verify(args);
            break;
        default:
            printHelp();
    }
}

main().catch((error) => {
    console.error('❌', (error as Error).message);
    process.exit(1);
});
