import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const BASE_MAINNET_RPC = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    networks: {
        // ── Testnet ──────────────────────────────────────
        baseSepolia: {
            url: "https://sepolia.base.org",
            chainId: 84532,
            accounts: [DEPLOYER_KEY],
        },
        // ── Mainnet ──────────────────────────────────────
        base: {
            url: BASE_MAINNET_RPC,
            chainId: 8453,
            accounts: [DEPLOYER_KEY],
        },
    },
    etherscan: {
        apiKey: {
            base: BASESCAN_API_KEY,
            baseSepolia: BASESCAN_API_KEY,
        },
        customChains: [
            {
                network: "base",
                chainId: 8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org",
                },
            },
            {
                network: "baseSepolia",
                chainId: 84532,
                urls: {
                    apiURL: "https://api-sepolia.basescan.org/api",
                    browserURL: "https://sepolia.basescan.org",
                },
            },
        ],
    },
};

export default config;
