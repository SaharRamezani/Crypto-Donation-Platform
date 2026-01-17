const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment of CharityDonation contract...\n");

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Deploy the contract
    console.log("Deploying CharityDonation...");
    const CharityDonation = await hre.ethers.getContractFactory("CharityDonation");
    const charityDonation = await CharityDonation.deploy();

    await charityDonation.waitForDeployment();
    const contractAddress = await charityDonation.getAddress();

    console.log("\n✅ CharityDonation deployed successfully!");
    console.log("Contract address:", contractAddress);
    console.log("Owner address:", deployer.address);

    // Get initial charities
    const charities = await charityDonation.getCharities();
    console.log("\nPre-loaded charities:");
    charities.forEach((charity, index) => {
        console.log(`  ${index + 1}. ${charity.name}`);
    });

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: contractAddress,
        ownerAddress: deployer.address,
        deployedAt: new Date().toISOString(),
        chainId: hre.network.config.chainId
    };

    // Create deployment directory if it doesn't exist
    const deploymentDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    // Save deployment info
    const deploymentFile = path.join(deploymentDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentFile}`);

    // Copy ABI to frontend
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "CharityDonation.sol", "CharityDonation.json");
    const frontendDir = path.join(__dirname, "..", "frontend");

    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        // Use network-specific config file for Sepolia, generic for others
        const configFileName = (hre.network.name === "sepolia")
            ? "contract-abi.sepolia.json"
            : "contract-abi.json";
        const abiPath = path.join(frontendDir, configFileName);

        const frontendConfig = {
            address: contractAddress,
            abi: artifact.abi,
            network: hre.network.name,
            chainId: hre.network.config.chainId
        };

        fs.writeFileSync(abiPath, JSON.stringify(frontendConfig, null, 2));
        console.log(`ABI and address saved to: ${abiPath}`);
    }

    // Verification instructions (for Sepolia)
    if (hre.network.name === "sepolia") {
        console.log("\n📋 To verify the contract on Etherscan, run:");
        console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
    }

    console.log("\n🎉 Deployment complete!");
    return contractAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
