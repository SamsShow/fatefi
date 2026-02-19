import { ethers } from 'ethers';

// ─── Contract ABI (only the functions we need) ──────────
export const POOL_ABI = [
    "function stake(uint8 option) external payable",
    "function claim(uint256 dayId) external",
    "function resolve(uint8 winner) external",
    "function currentDay() external view returns (uint256)",
    "function stakeAmount() external view returns (uint256)",
    "function getDayInfo(uint256 dayId) external view returns (uint256 totalStaked, uint256[3] optionTotals, uint256[3] optionCounts, bool resolved, uint8 winningOption)",
    "function getUserStake(uint256 dayId, address user) external view returns (bool exists, uint8 option, bool claimed)",
    "event Staked(address indexed user, uint256 indexed dayId, uint8 option, uint256 amount)",
    "event DayResolved(uint256 indexed dayId, uint8 winner, uint256 totalPool, uint256 winnerCount)",
    "event Claimed(address indexed user, uint256 indexed dayId, uint256 payout)",
];

const POOL_CONTRACT_ADDRESS = process.env.POOL_CONTRACT_ADDRESS || '';
const POOL_ADMIN_KEY = process.env.POOL_ADMIN_KEY || '';
// BASE_RPC_URL should point to mainnet (https://mainnet.base.org) in production
// and https://sepolia.base.org for testnet. Defaults to mainnet when deployed.
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const OPTION_MAP: Record<string, number> = {
    bullish: 0,
    bearish: 1,
    high: 2,
};

// ─── Admin Provider (backend) ────────────────────────────
function getAdminWallet(): ethers.Wallet {
    if (!POOL_ADMIN_KEY) throw new Error('POOL_ADMIN_KEY not set');
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    return new ethers.Wallet(POOL_ADMIN_KEY, provider);
}

function getPoolContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    if (!POOL_CONTRACT_ADDRESS) throw new Error('POOL_CONTRACT_ADDRESS not set');
    const provider = signerOrProvider || new ethers.JsonRpcProvider(BASE_RPC_URL);
    return new ethers.Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
}

// ─── Resolve (called by backend scheduler) ───────────────
/**
 * Send resolve() transaction to the pool contract.
 * @param outcome — 'bullish' | 'bearish' | 'high'
 */
export async function triggerContractResolution(outcome: string): Promise<string | null> {
    if (!POOL_CONTRACT_ADDRESS || !POOL_ADMIN_KEY) {
        console.log('[Pool] Contract not configured, skipping on-chain resolution');
        return null;
    }

    const optionIndex = OPTION_MAP[outcome];
    if (optionIndex === undefined) {
        console.error(`[Pool] Unknown outcome: ${outcome}`);
        return null;
    }

    try {
        const wallet = getAdminWallet();
        const contract = getPoolContract(wallet);
        console.log(`[Pool] Resolving day with winner=${outcome} (${optionIndex})`);

        const tx = await contract.resolve(optionIndex);
        console.log(`[Pool] Tx sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`[Pool] Resolved in block ${receipt.blockNumber}`);
        return tx.hash;
    } catch (err: any) {
        console.error(`[Pool] Resolution failed:`, err.message);
        return null;
    }
}

// ─── Read Pool Info ──────────────────────────────────────
export async function getCurrentDayInfo() {
    if (!POOL_CONTRACT_ADDRESS) return null;

    try {
        const contract = getPoolContract();
        const currentDay = await contract.currentDay();
        const [totalStaked, optionTotals, optionCounts, resolved, winningOption] = await contract.getDayInfo(currentDay);
        const stakeAmount = await contract.stakeAmount();

        return {
            dayId: Number(currentDay),
            totalStaked: ethers.formatEther(totalStaked),
            stakeAmount: ethers.formatEther(stakeAmount),
            options: {
                bullish: {
                    total: ethers.formatEther(optionTotals[0]),
                    count: Number(optionCounts[0]),
                },
                bearish: {
                    total: ethers.formatEther(optionTotals[1]),
                    count: Number(optionCounts[1]),
                },
                volatile: {
                    total: ethers.formatEther(optionTotals[2]),
                    count: Number(optionCounts[2]),
                },
            },
            resolved,
            winningOption: Number(winningOption),
        };
    } catch (err: any) {
        console.error('[Pool] Failed to read day info:', err.message);
        return null;
    }
}
