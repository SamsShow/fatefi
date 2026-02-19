'use client';

import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';

// ─── Contract Config ─────────────────────────────────────
export const POOL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POOL_CONTRACT || '';
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const POOL_ABI = [
    'function stake(uint8 option) external payable',
    'function claim(uint256 dayId) external',
    'function currentDay() external view returns (uint256)',
    'function stakeAmount() external view returns (uint256)',
    'function getDayInfo(uint256 dayId) external view returns (uint256 totalStaked, uint256[3] optionTotals, uint256[3] optionCounts, bool resolved, uint8 winningOption)',
    'function getUserStake(uint256 dayId, address user) external view returns (bool exists, uint8 option, bool claimed)',
];

export const STAKE_AMOUNT_ETH = '0.004'; // ~$10

const OPTION_MAP: Record<string, number> = {
    bullish: 0,
    bearish: 1,
    high: 2,
};

// ─── Helpers ─────────────────────────────────────────────

async function ensureBaseSepolia(provider: BrowserProvider) {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
        try {
            await provider.send('wallet_switchEthereumChain', [
                { chainId: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16) },
            ]);
        } catch (err: any) {
            // Chain not added — add it
            if (err.code === 4902) {
                await provider.send('wallet_addEthereumChain', [{
                    chainId: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16),
                    chainName: 'Base Sepolia',
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://sepolia.base.org'],
                    blockExplorerUrls: ['https://sepolia.basescan.org'],
                }]);
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
    if (!POOL_CONTRACT_ADDRESS) throw new Error('Pool contract not configured');
    const provider = getProvider();
    await ensureBaseSepolia(provider);
    const signer = await provider.getSigner();
    const contract = new Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, signer);
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
 * Claim winnings for a specific day.
 * @returns transaction hash
 */
export async function claimWinnings(dayId: number): Promise<string> {
    const { contract } = await getPoolContract();
    const tx = await contract.claim(dayId);
    const receipt = await tx.wait();
    return receipt.hash;
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
    if (!POOL_CONTRACT_ADDRESS) return null;

    try {
        const provider = getProvider();
        const contract = new Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
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
    if (!POOL_CONTRACT_ADDRESS) return null;

    try {
        const { contract, signer } = await getPoolContract();
        const address = await signer.getAddress();
        const [exists, option, claimed] = await contract.getUserStake(dayId, address);
        return { exists, option: Number(option), claimed };
    } catch {
        return null;
    }
}
