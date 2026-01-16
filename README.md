# Crypto Donation Platform

A decentralized application (dApp) for donating Sepolia ETH to charitable organizations.

## Features

- **Donate ETH** - Send Sepolia ETH directly to verified charities
- **Pre-loaded Charities** - 5 initial charities ready for donations
- **Propose Charities** - Anyone can propose new charities for approval
- **Admin Controls** - Contract owner can approve/reject charity proposals
- **Leaderboard** - Track top donors on the platform
- **Transaction History** - View all donations via events
- **Security** - Reentrancy protection and access control

## Project Structure

```
Crypto-Donation-Platform/
├── contracts/
│   └── CharityDonation.sol      # Main smart contract
├── frontend/
│   ├── index.html               # Web interface
│   ├── styles.css               # Premium dark theme styling
│   ├── app.js                   # ethers.js integration
│   └── contract-abi.json        # Contract ABI
├── scripts/
│   └── deploy.js                # Deployment script
├── test/
│   └── CharityDonation.test.js  # Contract tests
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Node.js dependencies
└── .env.example                 # Environment template
```

## Quick Start

### Run with Docker (Recommended)

Start all services with Docker Compose:
```bash
# Start Docker daemon first (may need sudo)
sudo systemctl start docker

# Build and run all services
docker compose up --build
```

This starts:
- **Hardhat Node** on `http://localhost:8545`
- **Frontend** on `http://localhost:3000`

Open **http://localhost:3000** in your browser to use the dApp!

To stop:
```bash
docker compose down
```

### Run Tests

```bash
npm install
npx hardhat test
```

### Deploy to Sepolia (Public Testnet)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   - `SEPOLIA_RPC_URL` - Get from [Infura](https://infura.io) or [Alchemy](https://alchemy.com)
   - `PRIVATE_KEY` - Your wallet private key (with Sepolia ETH)

3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```


## Deployment & Verification

### Local vs. Public Networks

- **Local Network (Hardhat/Docker)**: A private blockchain running on your computer. It uses auto-generated test accounts with fake ETH. No real private keys are needed for deployment. Perfect for development.
- **Public Testnet (Sepolia)**: A public version of Ethereum for testing. Anyone can see your contract here. You need actual Sepolia ETH and your own **Private Key** to deploy.

### Deployment & Private Keys

When deploying to a **Public Network (Sepolia)**:
1. You must provide your **Private Key** in a `.env` file. 
2. This is because public blockchains require a signature from a real account to authorize the deployment transaction and pay gas fees.
3. Your local Docker deployment doesn't ask for a key because it uses Hardhat's pre-configured development accounts.

### Contract Verification

**Verification** is the process of making your source code public on [Etherscan](https://etherscan.io).
- It allows users to read your code and verify it matches the deployed bytecode.
- It enables direct interaction with the contract through the Etherscan UI.
- To verify on Sepolia: 
  ```bash
  npx hardhat verify --network sepolia <CONTRACT_ADDRESS_ON_SEPOLIA>
  ```

---

## Smart Contract

### CharityDonation.sol

| Function | Description |
|----------|-------------|
| `donate(charityId)` | Send ETH to a charity |
| `proposeCharity(name, description, wallet)` | Propose a new charity |
| `approveCharity(proposalId)` | Admin: approve proposal |
| `rejectCharity(proposalId)` | Admin: reject proposal |
| `withdrawFunds(charityId)` | Charity: withdraw funds |
| `getCharities()` | Get all charities |
| `getDonorLeaderboard(limit)` | Get top donors |
| `getRecentDonations(limit)` | Get recent donations |

### Events

- `DonationReceived(donor, charityId, amount, timestamp)`
- `CharityProposed(proposer, name, wallet, proposalId)`
- `CharityApproved(charityId, name, wallet)`
- `CharityRejected(proposalId, name)`
- `FundsWithdrawn(charityId, recipient, amount)`

### Security Features

- **Reentrancy Guard** - Prevents reentrancy attacks
- **Checks-Effects-Interactions** - State updates before external calls
- **Access Control** - `onlyOwner` modifier for admin functions

## Technology Stack

- **Smart Contract**: Solidity ^0.8.19
- **Development**: Hardhat
- **Frontend**: HTML, CSS, JavaScript
- **Blockchain Interaction**: ethers.js v5.7
- **Network**: Ethereum Sepolia Testnet