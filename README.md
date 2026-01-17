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

#### Prerequisites

- [MetaMask](https://metamask.io/) browser extension installed
- Node.js and npm installed
- Some Sepolia testnet ETH (free, see below)

#### Step 1: Get Sepolia ETH (Free)

You need testnet ETH to pay for deployment gas fees. Get free Sepolia ETH from a faucet:

| Faucet | URL | Notes |
|--------|-----|-------|
| Google Cloud | https://cloud.google.com/application/web3/faucet/ethereum/sepolia | Requires Google account |
| Alchemy | https://sepoliafaucet.com | Requires Alchemy account |
| Infura | https://www.infura.io/faucet/sepolia | Requires Infura account |
| QuickNode | https://faucet.quicknode.com/ethereum/sepolia | Requires QuickNode account |

> **Tip**: Copy your MetaMask wallet address and paste it into the faucet. You'll receive 0.1-0.5 Sepolia ETH, which is more than enough for deployment.

#### Step 2: Get an RPC URL

You need an RPC endpoint to connect to Sepolia. Choose one provider:

**Option A: Alchemy (Recommended)**
1. Go to https://alchemy.com and create a free account
2. Create a new app → Select "Ethereum" → Select "Sepolia"
3. Copy the HTTPS URL (looks like `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`)

**Option B: Infura**
1. Go to https://infura.io and create a free account
2. Create a new project → Select "Web3 API"
3. Copy the Sepolia endpoint (looks like `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`)

#### Step 3: Export Your Private Key

1. Open MetaMask
2. Click the three dots (⋮) next to your account name
3. Open in Full Screen
4. Select "Account details"
5. Click "Show private key"
6. Enter your password and copy the key

> ⚠️ **SECURITY WARNING**: Never share your private key. Never commit it to git. Only use a wallet with testnet ETH for development.

#### Step 4: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your values:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_without_0x_prefix
ETHERSCAN_API_KEY=your_etherscan_api_key  # Optional, for verification
```

#### Step 5: Install Dependencies & Deploy

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# To verify the contract on Etherscan, run:
# Replace <contract_address> with the actual contract address: 0x1D6f35C4ACe61261F6f08e46e5E5e15bb7aB459c
npx hardhat verify --network sepolia <contract_address>
```

#### Step 6: Update Frontend for Sepolia

The deploy script automatically updates `frontend/contract-abi.json` with the new contract address. However, you need to make sure MetaMask is connected to Sepolia:

1. Open MetaMask
2. Click the network dropdown at the top
3. Select "Sepolia test network"
4. Visit your frontend and connect your wallet

#### Step 7: Verify Contract on Etherscan (Optional)

Verification makes your source code public and allows users to interact with your contract directly on Etherscan.

1. Get an Etherscan API key from https://etherscan.io/myapikey
2. Add it to your `.env` file as `ETHERSCAN_API_KEY`
3. Run verification:
   ```bash
   npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
   ```

Once verified, you can view your contract at:
`https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`


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