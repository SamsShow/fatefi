import { ethers, network } from "hardhat";

const NETWORK_LABELS: Record<string, string> = {
    base: "Base Mainnet",
    baseSepolia: "Base Sepolia (testnet)",
    hardhat: "Hardhat local",
    localhost: "Localhost",
};

async function main() {
    const [deployer] = await ethers.getSigners();
    const net = network.name;
    const label = NETWORK_LABELS[net] ?? net;
    const isMainnet = net === "base";

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  FateFiPool Deployment — ${label}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Deployer :", deployer.address);
    console.log("  Balance  :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    if (isMainnet) {
        console.log("\n  ⚠️  MAINNET DEPLOYMENT — double-check everything!");
    }

    // ~$5 at ~$2500/ETH = 0.002 ETH
    const STAKE_AMOUNT = ethers.parseEther("0.002");

    const FateFiPool = await ethers.getContractFactory("FateFiPool");
    const pool = await FateFiPool.deploy(STAKE_AMOUNT);
    await pool.waitForDeployment();

    const address = await pool.getAddress();
    const explorerBase = isMainnet ? "https://basescan.org" : "https://sepolia.basescan.org";

    console.log("\n  ✅ FateFiPool deployed!");
    console.log("  Address    :", address);
    console.log("  Stake amt  :", ethers.formatEther(STAKE_AMOUNT), "ETH");
    console.log("  Admin      :", deployer.address);
    console.log(`  Explorer   : ${explorerBase}/address/${address}`);

    console.log("\n  ── Add these to your .env ──────────────────────────────────");
    console.log(`  POOL_CONTRACT_ADDRESS=${address}`);
    console.log(`  POOL_ADMIN_KEY=<your-deployer-private-key>`);

    if (isMainnet) {
        console.log(`  BASE_RPC_URL=https://mainnet.base.org`);
        console.log("");
        console.log("  ── Verify on Basescan ─────────────────────────────────────");
        console.log(`  npx hardhat verify --network base ${address} "${STAKE_AMOUNT.toString()}"`);
    } else {
        console.log(`  BASE_RPC_URL=https://sepolia.base.org`);
        console.log("");
        console.log("  ── Verify on Basescan (Sepolia) ────────────────────────────");
        console.log(`  npx hardhat verify --network baseSepolia ${address} "${STAKE_AMOUNT.toString()}"`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
