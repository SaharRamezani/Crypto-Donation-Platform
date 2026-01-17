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

### Local Development with Hardhat (No Deployment Needed)

If you want to test transactions locally without deploying to Sepolia, follow these steps:

#### Step 1: Force Local Hardhat Mode

By default, Docker uses your Sepolia deployment if it exists. To force local Hardhat mode:

```bash
# Temporarily rename/remove the Sepolia config
mv frontend/contract-abi.sepolia.json frontend/contract-abi.sepolia.json.bak

# Start Docker (will deploy to local Hardhat)
docker compose up --build
```

#### Step 2: Add Hardhat Network to MetaMask

1. Open MetaMask → Click network dropdown → **Add Network**
2. Click **"Add a network manually"**
3. Enter these settings:

| Field | Value |
|-------|-------|
| Network Name | Hardhat Local |
| RPC URL | `http://localhost:8545` |
| Chain ID | `31337` |
| Currency Symbol | ETH |

4. Click **Save**

#### Step 3: Import a Test Account

Hardhat provides pre-funded test accounts. Import one into MetaMask:

1. When Docker starts, you'll see accounts in the terminal like:
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

2. In MetaMask → Click account icon → **Import Account**
3. Paste the private key (without `0x` prefix)
4. Click **Import**

> **Note**: These are test accounts with fake ETH. Never use these private keys on mainnet!

#### Step 4: Connect and Test

1. Make sure MetaMask is on the **Hardhat Local** network
2. Go to `http://localhost:3000`
3. Connect wallet and make test donations!

#### Restore Sepolia Mode

When done testing locally, restore your Sepolia config:

```bash
mv frontend/contract-abi.sepolia.json.bak frontend/contract-abi.sepolia.json
docker compose down && docker compose up
```

### Run Tests

```bash
npm install
npx hardhat test
```

### Share Remotely with Cloudflare Tunnel

To demo the project to remote stakeholders using your laptop as a server:

#### Step 1: Install Cloudflared

```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### Step 2: Start Your Project

```bash
docker compose up
```

#### Step 3: Create a Public Tunnel

In a new terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

You'll see output like:
```
|  Your quick Tunnel has been created! Visit it at:                    |
|  https://random-words-here.trycloudflare.com                         |
```

Share this URL with stakeholders!

#### Important Notes

- **Keep both terminals running** (docker compose + cloudflared)
- **Stakeholders need MetaMask** connected to Sepolia to interact with the real contract
- **URL changes each time** you restart cloudflared (unless you create a named tunnel with a Cloudflare account)

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
# Replace <contract_address> with the actual contract address: 0x586a3D92D10C37B69500D7c2Bb540e53Af1BD3ed
npx hardhat verify --network sepolia <contract_address>
```

#### Step 6: Switch MetaMask to Sepolia Network

**Important:** You must switch MetaMask to the Sepolia network before using the dApp.

1. Open MetaMask in your browser
2. Click the **network icon** in the top-left corner (it may say "Ethereum Mainnet")
3. Select **"Sepolia"** from the dropdown list
4. If Sepolia is not visible:
   - Go to Settings → Advanced
   - Enable "Show test networks"
   - Go back and select Sepolia

> ⚠️ **Common Error**: If you see "Connection Failed" or "CALL_EXCEPTION", it means MetaMask is on the wrong network. Switch to Sepolia and try again.

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

#### Step 8: Use Frontend with Sepolia (Real Transactions)

Now that your contract is deployed to Sepolia, you can make real transactions:

1. **Stop Docker** (optional, but cleaner):
   ```bash
   docker compose down
   ```

2. **Serve your frontend** using any web server:
   ```bash
   cd frontend
   npx serve .
   ```
   Or simply open `frontend/index.html` in your browser.

3. **Switch MetaMask to Sepolia**:
   - Open MetaMask → Click network dropdown → Select "Sepolia test network"

4. **Connect & Donate**:
   - Visit your frontend
   - Click "Connect Wallet"
   - Choose a charity and donate Sepolia ETH!

Your transactions will be visible on [Sepolia Etherscan](https://sepolia.etherscan.io).


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

### Charity Withdrawals (Pull over Push Pattern)

This project implements the **"Pull over Push"** security pattern (also known as the Withdrawal Pattern).

#### What is Pull over Push?
Instead of the contract automatically "pushing" (sending) donations to a charity's wallet at the moment a donor contributes, the funds are held securely in the contract. The charity owner must then "pull" (withdraw) their accumulated funds manually.

#### Why use this?
1. **Security**: Automatically sending money to an address can be dangerous. If a charity's wallet is a malicious smart contract, its "fallback" function could trigger a reentrancy attack or purposefully fail the transaction to crash your dApp.
2. **Standardization**: It ensures that a failure in one charity's receiving logic doesn't affect the donor's experience or the platform's overall reliability.
3. **Gas Efficiency**: The cost of transferring the funds is handled by the recipient when they choose to withdraw, rather than adding cost to every single donation transaction.

#### How to Withdraw
1. Connect your MetaMask wallet using the **exact address** registered for the charity.
2. A green **"Withdraw Funds"** panel will appear on your charity card.
3. Click the button and confirm the transaction to claim your ETH.

## Technology Stack

- **Smart Contract**: Solidity ^0.8.19
- **Development**: Hardhat
- **Frontend**: HTML, CSS, JavaScript
- **Blockchain Interaction**: ethers.js v5.7
- **Network**: Ethereum Sepolia Testnet