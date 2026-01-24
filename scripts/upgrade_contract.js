const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}_proxy.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error(`Error: Deployment file for ${network.name} not found.`);
        process.exit(1);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const proxyAddress = deploymentInfo.proxyAddress;

    console.log(`Starting upgrade for CharityDonation proxy at: ${proxyAddress}\n`);

    const CharityDonationV2 = await ethers.getContractFactory("CharityDonationV2");

    console.log("Upgrading CharityDonation to V2...");
    const upgraded = await upgrades.upgradeProxy(proxyAddress, CharityDonationV2);

    await upgraded.waitForDeployment();
    const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    // Verify upgrade by calling V2-specific function
    const version = await upgraded.getVersion();
    console.log("\n✅ CharityDonation upgraded to V2 successfully!");
    console.log("Contract Version:", version);
    console.log("Proxy Address:", proxyAddress);
    console.log("New Implementation Address:", newImplementationAddress);

    // Update deployment info
    deploymentInfo.implementationAddress = newImplementationAddress;
    deploymentInfo.lastUpgradedAt = new Date().toISOString();
    deploymentInfo.version = version;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    console.log(`Updated deployment info in: ${deploymentFile}`);

    // Update frontend ABI (in case methods changed)
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "CharityDonationV2.sol", "CharityDonationV2.json");
    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        const configFileName = (network.name === "sepolia") ? "contract-abi.sepolia.json" : "contract-abi.json";
        const abiPath = path.join(__dirname, "..", "frontend", configFileName);

        const frontendConfig = JSON.parse(fs.readFileSync(abiPath, "utf8"));
        frontendConfig.abi = artifact.abi;
        frontendConfig.implementation = newImplementationAddress;
        frontendConfig.version = version;

        fs.writeFileSync(abiPath, JSON.stringify(frontendConfig, null, 2));
        console.log(`Updated frontend ABI and implementation address.`);
    }

    console.log("\n🎉 Upgrade complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Upgrade failed:", error);
        process.exit(1);
    });
