require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.27",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        docker: {
            url: "http://crypto-donation-hardhat:8545",
            chainId: 31337
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || ""
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
