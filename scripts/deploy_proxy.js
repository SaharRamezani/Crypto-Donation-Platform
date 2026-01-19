const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment of CharityDonation Upgradeable Proxy...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Deploy Proxy
    console.log("Deploying CharityDonation Proxy...");
    const CharityDonation = await ethers.getContractFactory("CharityDonation");

    // We use 'uups' kind for UUPS pattern
    const charityDonation = await upgrades.deployProxy(CharityDonation, [], {
        initializer: "initialize",
        kind: "uups"
    });

    await charityDonation.waitForDeployment();
    const proxyAddress = await charityDonation.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log("\n✅ CharityDonation Proxy deployed successfully!");
    console.log("Proxy Address:", proxyAddress);
    console.log("Implementation Address:", implementationAddress);
    console.log("Admin address:", deployer.address);

    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        proxyAddress: proxyAddress,
        implementationAddress: implementationAddress,
        adminAddress: deployer.address,
        deployedAt: new Date().toISOString(),
        chainId: network.config.chainId,
        type: "uups-proxy"
    };

    const deploymentDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentDir, `${network.name}_proxy.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentFile}`);

    // Update frontend ABI
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "CharityDonation.sol", "CharityDonation.json");
    const frontendDir = path.join(__dirname, "..", "frontend");

    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        const configFileName = (network.name === "sepolia") ? "contract-abi.sepolia.json" : "contract-abi.json";
        const abiPath = path.join(frontendDir, configFileName);

        const frontendConfig = {
            address: proxyAddress, // Use the proxy address for the frontend
            abi: artifact.abi,
            network: network.name,
            chainId: network.config.chainId,
            isProxy: true,
            implementation: implementationAddress
        };

        fs.writeFileSync(abiPath, JSON.stringify(frontendConfig, null, 2));
        console.log(`ABI and Proxy address saved to: ${abiPath}`);
    }

    console.log("\n🎉 Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
