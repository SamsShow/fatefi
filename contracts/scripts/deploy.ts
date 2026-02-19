import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // ~$10 in ETH at ~$2500/ETH = 0.004 ETH
    const STAKE_AMOUNT = ethers.parseEther("0.004");

    const FateFiPool = await ethers.getContractFactory("FateFiPool");
    const pool = await FateFiPool.deploy(STAKE_AMOUNT);
    await pool.waitForDeployment();

    const address = await pool.getAddress();
    console.log("\n✅ FateFiPool deployed to:", address);
    console.log("   Stake amount:", ethers.formatEther(STAKE_AMOUNT), "ETH (~$10)");
    console.log("   Admin:", deployer.address);
    console.log("\nAdd to your .env:");
    console.log(`   POOL_CONTRACT_ADDRESS=${address}`);
    console.log(`   POOL_ADMIN_KEY=<your-deployer-private-key>`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
