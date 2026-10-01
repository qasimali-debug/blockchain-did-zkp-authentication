const { ethers } = require("hardhat");

async function main() {
  console.log("─".repeat(50));
  console.log("Deploying DIDAuth Smart Contract...");
  console.log("─".repeat(50));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance : ${ethers.formatEther(balance)} ETH`);
  console.log("─".repeat(50));

  // Deploy DIDAuth
  const DIDAuth = await ethers.getContractFactory("DIDAuth");
  const didAuth = await DIDAuth.deploy();
  await didAuth.waitForDeployment();

  const contractAddress = await didAuth.getAddress();

  console.log(`✅ DIDAuth deployed to: ${contractAddress}`);
  console.log("─".repeat(50));
  console.log("\n📋 Next Steps:");
  console.log(`   1. Copy this address: ${contractAddress}`);
  console.log("   2. Update backend/.env → CONTRACT_ADDRESS");
  console.log("   3. Update frontend/.env → REACT_APP_CONTRACT_ADDRESS");
  console.log("─".repeat(50));

  // Save deployment info to a file for convenience
  const fs = require("fs");
  const deployInfo = {
    network: (await ethers.provider.getNetwork()).name,
    contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deployInfo, null, 2)
  );
  console.log("\n📄 Deployment info saved to contracts/deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
