'use client';

import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';

// ─── Contract Config ─────────────────────────────────────
const DEFAULT_CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN_ENV === 'testnet' ? 'testnet' : 'mainnet';
const POOL_CONTRACT_MAINNET = process.env.NEXT_PUBLIC_POOL_CONTRACT_MAINNET || process.env.NEXT_PUBLIC_POOL_CONTRACT || '';
const POOL_CONTRACT_TESTNET = process.env.NEXT_PUBLIC_POOL_CONTRACT_TESTNET || '';
const NETWORK_STORAGE_KEY = 'fatefi_network';

export type UserNetwork = 'mainnet' | 'testnet';
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_MAINNET_CHAIN_ID = 8453;

function normalizeNetwork(network: string | null | undefined): UserNetwork {
    if (network === 'mainnet' || network === 'testnet') return network;
    return DEFAULT_CHAIN_ENV;
}

export function getSelectedNetwork(): UserNetwork {
    if (typeof window === 'undefined') return DEFAULT_CHAIN_ENV;
    return normalizeNetwork(localStorage.getItem(NETWORK_STORAGE_KEY));
}

export function setSelectedNetwork(network: UserNetwork) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NETWORK_STORAGE_KEY, network);
    window.dispatchEvent(new CustomEvent('fatefi-network-changed', { detail: network }));
}

export function isMainnetSelected(): boolean {
    return getSelectedNetwork() === 'mainnet';
}

export function getTargetChainId(network = getSelectedNetwork()): number {
    return network === 'mainnet' ? BASE_MAINNET_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;
}

export function getPoolContractAddress(network = getSelectedNetwork()): string {
    return network === 'mainnet' ? POOL_CONTRACT_MAINNET : POOL_CONTRACT_TESTNET;
}

export function getExplorerBaseUrl(network = getSelectedNetwork()): string {
    return network === 'mainnet' ? 'https://basescan.org' : 'https://sepolia.basescan.org';
}

export function getNetworkLabel(network = getSelectedNetwork()): string {
    return network === 'mainnet' ? 'Base Mainnet' : 'Base Sepolia';
}

export const POOL_ABI = [
    'function stake(uint8 option) external payable',
    'function claim(uint256 dayId) external',
    'function claimRefund(uint256 dayId) external',
    'function currentDay() external view returns (uint256)',
    'function stakeAmount() external view returns (uint256)',
    'function isDayRefundable(uint256 dayId) external view returns (bool)',
    'function getDayInfo(uint256 dayId) external view returns (uint256 totalStaked, uint256[3] optionTotals, uint256[3] optionCounts, bool resolved, uint8 winningOption)',
    'function getUserStake(uint256 dayId, address user) external view returns (bool exists, uint8 option, bool claimed)',
];

export const STAKE_AMOUNT_ETH = '0.002'; // ~$5

const OPTION_MAP: Record<string, number> = {
    bullish: 0,
    bearish: 1,
    high: 2,
};

// ─── Helpers ─────────────────────────────────────────────

async function ensureTargetChain(provider: BrowserProvider, network: UserNetwork) {
    const targetChainId = getTargetChainId(network);
    const currentNetwork = await provider.getNetwork();
    if (Number(currentNetwork.chainId) !== targetChainId) {
        try {
            await provider.send('wallet_switchEthereumChain', [
                { chainId: '0x' + targetChainId.toString(16) },
            ]);
        } catch (err: any) {
            // Chain not added yet — add it
            if (err.code === 4902) {
                if (network === 'mainnet') {
                    await provider.send('wallet_addEthereumChain', [{
                        chainId: '0x' + BASE_MAINNET_CHAIN_ID.toString(16),
                        chainName: 'Base',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://mainnet.base.org'],
                        blockExplorerUrls: ['https://basescan.org'],
                    }]);
                } else {
                    await provider.send('wallet_addEthereumChain', [{
                        chainId: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16),
                        chainName: 'Base Sepolia',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://sepolia.base.org'],
                        blockExplorerUrls: ['https://sepolia.basescan.org'],
                    }]);
                }
            } else {
                throw err;
            }
        }
    }
}

function getProvider(): BrowserProvider {
    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No wallet detected');
    }
    return new BrowserProvider(window.ethereum);
}

async function getPoolContract(): Promise<{ contract: Contract; signer: any }> {
    const selectedNetwork = getSelectedNetwork();
    const poolContractAddress = getPoolContractAddress(selectedNetwork);

    if (!poolContractAddress) {
        throw new Error(`Pool contract not configured for ${selectedNetwork}`);
    }

    const provider = getProvider();
    await ensureTargetChain(provider, selectedNetwork);
    const signer = await provider.getSigner();
    const contract = new Contract(poolContractAddress, POOL_ABI, signer);
    return { contract, signer };
}

// ─── Actions ─────────────────────────────────────────────

/**
 * Stake on an option for today.
 * @returns transaction hash
 */
export async function stakeOnOption(option: string): Promise<string> {
    const optionIndex = OPTION_MAP[option];
    if (optionIndex === undefined) throw new Error(`Invalid option: ${option}`);

    const { contract } = await getPoolContract();
    const tx = await contract.stake(optionIndex, {
        value: parseEther(STAKE_AMOUNT_ETH),
    });

    const receipt = await tx.wait();
    return receipt.hash;
}

/**
 * Claim winnings for a specific day (winners only).
 * @returns transaction hash
 */
export async function claimWinnings(dayId: number): Promise<string> {
    const { contract } = await getPoolContract();
    const tx = await contract.claim(dayId);
    const receipt = await tx.wait();
    return receipt.hash;
}

/**
 * Claim a full stake refund on a zero-winner day (everyone gets their stake back).
 * @returns transaction hash
 */
export async function claimStakeRefund(dayId: number): Promise<string> {
    const { contract } = await getPoolContract();
    const tx = await contract.claimRefund(dayId);
    const receipt = await tx.wait();
    return receipt.hash;
}

/**
 * Check if a resolved day had zero winners (full stake refundable).
 */
export async function isDayRefundable(dayId: number): Promise<boolean> {
    const poolContractAddress = getPoolContractAddress();
    if (!poolContractAddress) return false;
    try {
        const provider = getProvider();
        const contract = new Contract(poolContractAddress, POOL_ABI, provider);
        return await contract.isDayRefundable(dayId);
    } catch {
        return false;
    }
}

// ─── Reads ───────────────────────────────────────────────

export interface PoolInfo {
    dayId: number;
    totalStaked: string;
    stakeAmount: string;
    options: {
        bullish: { total: string; count: number };
        bearish: { total: string; count: number };
        volatile: { total: string; count: number };
    };
    resolved: boolean;
}

export async function getPoolInfo(): Promise<PoolInfo | null> {
    const selectedNetwork = getSelectedNetwork();
    const poolContractAddress = getPoolContractAddress(selectedNetwork);
    if (!poolContractAddress) return null;

    try {
        const provider = getProvider();
        await ensureTargetChain(provider, selectedNetwork);
        const contract = new Contract(poolContractAddress, POOL_ABI, provider);
        const currentDay = await contract.currentDay();
        const [totalStaked, optionTotals, optionCounts, resolved] = await contract.getDayInfo(currentDay);
        const stakeAmt = await contract.stakeAmount();

        return {
            dayId: Number(currentDay),
            totalStaked: formatEther(totalStaked),
            stakeAmount: formatEther(stakeAmt),
            options: {
                bullish: { total: formatEther(optionTotals[0]), count: Number(optionCounts[0]) },
                bearish: { total: formatEther(optionTotals[1]), count: Number(optionCounts[1]) },
                volatile: { total: formatEther(optionTotals[2]), count: Number(optionCounts[2]) },
            },
            resolved,
        };
    } catch {
        return null;
    }
}

export async function getUserStakeForDay(dayId: number): Promise<{ exists: boolean; option: number; claimed: boolean } | null> {
    const poolContractAddress = getPoolContractAddress();
    if (!poolContractAddress) return null;

    try {
        const { contract, signer } = await getPoolContract();
        const address = await signer.getAddress();
        const [exists, option, claimed] = await contract.getUserStake(dayId, address);
        return { exists, option: Number(option), claimed };
    } catch {
        return null;
    }
}
