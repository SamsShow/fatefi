import { getAccount, getWalletClient } from '@wagmi/core';
import { getNonce, verifySignature } from './api';
import { wagmiConfig } from './reown';

export async function connectWallet(): Promise<string> {
    const account = getAccount(wagmiConfig);
    if (!account.address) {
        throw new Error('No wallet connected. Use Connect Wallet first.');
    }
    return account.address;
}

export async function signInWithWallet(): Promise<{ token: string; user: any }> {
    const walletClient = await getWalletClient(wagmiConfig);
    if (!walletClient?.account?.address) {
        throw new Error('Wallet is not connected. Connect wallet first.');
    }

    const address = walletClient.account.address;
    const { message } = await getNonce(address);

    const signature = await walletClient.signMessage({
        account: walletClient.account,
        message,
    });

    const result = await verifySignature(address, signature);

    // Store token & wallet
    localStorage.setItem('fatefi_token', result.token);
    localStorage.setItem('fatefi_wallet', address);
    window.dispatchEvent(new Event('fatefi-auth-changed'));

    return result;
}

export function disconnect() {
    localStorage.removeItem('fatefi_token');
    localStorage.removeItem('fatefi_wallet');
    window.dispatchEvent(new Event('fatefi-auth-changed'));
}

export function getStoredWallet(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fatefi_wallet');
}

export function isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('fatefi_token');
}

export function shortenAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
