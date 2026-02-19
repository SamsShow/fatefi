import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    networks: {
        baseSepolia: {
            url: "https://sepolia.base.org",
            chainId: 84532,
            accounts: [DEPLOYER_KEY],
        },
    },
};

export default config;
