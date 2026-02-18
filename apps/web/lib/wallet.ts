import { BrowserProvider } from 'ethers';
import { getNonce, verifySignature } from './api';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export async function connectWallet(): Promise<string> {
    if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask.');
    }
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    return accounts[0];
}

export async function signInWithWallet(): Promise<{ token: string; user: any }> {
    const address = await connectWallet();
    const { message } = await getNonce(address);

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);

    const result = await verifySignature(address, signature);

    // Store token & wallet
    localStorage.setItem('fatefi_token', result.token);
    localStorage.setItem('fatefi_wallet', address);

    return result;
}

export function disconnect() {
    localStorage.removeItem('fatefi_token');
    localStorage.removeItem('fatefi_wallet');
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
