import axios, { type AxiosInstance } from 'axios';
import { withPaymentInterceptor } from 'x402-axios';
import { createWalletClient, custom, type Address } from 'viem';
import { base } from 'viem/chains';

declare global {
    interface Window {
        ethereum?: any;
    }
}

const PAY_TOKEN = (process.env.NEXT_PUBLIC_ELSA_PAY_TOKEN || 'usdc').toLowerCase();
const BASE_URL = PAY_TOKEN === 'elsa'
    ? 'https://x402-api.heyelsa.ai/api/elsa'
    : 'https://x402-api.heyelsa.ai/api';

let cachedAddress: string | null = null;
let cachedClient: AxiosInstance | null = null;

async function getConnectedAddress(): Promise<Address> {
    if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask.');
    }
    const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
    if (!accounts?.length) {
        throw new Error('Connect your wallet first to pay for Elsa requests.');
    }
    return accounts[0] as Address;
}

async function getElsaAxiosClient(): Promise<AxiosInstance> {
    const address = await getConnectedAddress();
    if (cachedClient && cachedAddress?.toLowerCase() === address.toLowerCase()) {
        return cachedClient;
    }

    const walletClient = createWalletClient({
        account: address,
        chain: base,
        transport: custom(window.ethereum),
    });

    const raw = axios.create({
        baseURL: BASE_URL,
        timeout: 30_000,
    });

    cachedClient = withPaymentInterceptor(raw, walletClient as any);
    cachedAddress = address;
    return cachedClient;
}

export async function getElsaPortfolioUserPaid(walletAddress: string): Promise<any> {
    const client = await getElsaAxiosClient();
    const { data } = await client.post('/get_portfolio', { wallet_address: walletAddress });
    return data;
}

export async function getElsaBalancesUserPaid(walletAddress: string): Promise<any> {
    const client = await getElsaAxiosClient();
    const { data } = await client.post('/get_balances', { wallet_address: walletAddress });
    return data;
}
