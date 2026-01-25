# Crypto Donation Platform

A decentralized application (dApp) for donating Sepolia ETH to charitable organizations.

## Features

- **Donate ETH** - Send Sepolia ETH directly to verified charities
- **Pre-loaded Charities** - 1 initial charity ready for donations
- **Propose Charities** - Anyone can propose new charities for approval
- **Multi-admin Governance** - Multiple administrators can manage proposals and contract settings
- **Upgradeable Contract** - UUPS proxy-based architecture allowing for safe contract upgrades
- **Version Tracking** - V2 contract includes version tracking (`getVersion()`)
- **Leaderboard** - Track top donors on the platform
- **Transaction History** - View all donations via events
- **Security** - Reentrancy protection, AccessControl (Roles), and UUPS Proxy

## Project Structure

```
Crypto-Donation-Platform/
├── contracts/
│   ├── CharityDonation.sol       # V1 implementation (base contract)
│   └── CharityDonationV2.sol     # V2 implementation (adds version tracking)
├── frontend/
│   ├── index.html                # Web interface
│   ├── styles.css                # Theme styling
│   ├── app.js                    # ethers.js integration
│   └── contract-abi.json         # Contract ABI (auto-generated)
├── scripts/
│   ├── deploy_proxy.js           # Deploys the initial V1 proxy
│   └── upgrade_contract.js       # Upgrades proxy to V2
├── deployments/                  # Deployment records and proxy addresses
├── test/
│   ├── CharityDonation.test.js   # V1 contract tests
│   └── CharityDonationV2.test.js # V2 upgrade tests
├── docker/
│   └── nginx.conf                # Nginx configuration
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker Compose configuration
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Node.js dependencies
└── .env.example                  # Environment template
```

---

# Local Development with Hardhat

If you want to test transactions locally without deploying to Sepolia:

## Step 1: Force Local Hardhat Mode

By default, Docker uses your Sepolia deployment if it exists. To force local mode:

```bash
# Start Docker daemon first (may need sudo)
sudo systemctl start docker

# Temporarily rename the Sepolia config
mv frontend/contract-abi.sepolia.json frontend/contract-abi.sepolia.json.bak

# Start Docker (will deploy to local Hardhat)
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

> **Note**: When you move from Hardhat to Sepolia (and vice versa), you need to modify the .env file and change the private key, Metasmask network, clear the cache, and refresh the page.

## Step 2: Add Hardhat Network to MetaMask

1. Open MetaMask → Click network dropdown → **Add Network**
2. Enter these settings:

| Field | Value |
|-------|-------|
| Network Name | Hardhat Local |
| RPC URL | `http://localhost:8545` |
| Chain ID | `31337` |
| Currency Symbol | ETH |

## Step 3: Import a Test Account

Hardhat provides pre-funded test accounts. Import one into MetaMask:

1. When Docker starts, you'll see accounts in the terminal:
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

2. In MetaMask → Click account → **Import Account**
3. Paste the private key
4. Click **Import**

> **Note**: These are test accounts with fake ETH. Never use these private keys on mainnet!

## Step 4: Restore Sepolia Mode

When done testing locally:

```bash
mv frontend/contract-abi.sepolia.json.bak frontend/contract-abi.sepolia.json
docker compose down && docker compose up
```

---

# Deploy to Sepolia (Public Testnet)

This section explains how to deploy your contract to the real Sepolia testnet so anyone in the world can interact with it.

## Prerequisites

- [MetaMask](https://metamask.io/) browser extension
- Node.js and npm installed
- Some Sepolia testnet ETH (free, see below)

## Step 1: Get Sepolia ETH (Free)

You need testnet ETH to pay for gas fees. Get it from a faucet:

| Faucet | URL | Notes |
|--------|-----|-------|
| Google Cloud | https://cloud.google.com/application/web3/faucet/ethereum/sepolia | Requires Google account |
| Alchemy | https://sepoliafaucet.com | Requires Alchemy account |
| Infura | https://www.infura.io/faucet/sepolia | Requires Infura account |

> **Tip**: Copy your MetaMask wallet address and paste it into the faucet. You'll receive 0.1-0.5 Sepolia ETH, which is more than enough for deployment.

## Step 2: Get an RPC URL

You need an RPC endpoint to connect to Sepolia. Choose a provider:

**Alchemy (Recommended)**:
1. Go to https://alchemy.com and create a free account
2. Create a new app → Select **"Ethereum"** → **"Sepolia"**
3. Copy the HTTPS URL (looks like `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`)

**Infura (Alternative)**:
1. Go to https://infura.io and create a free account
2. Create a new project → Select "Web3 API"
3. Copy the Sepolia endpoint

## Step 3: Export Your Private Key from MetaMask

1. Open MetaMask in your browser
2. Click the three dots (⋮) next to your account name
3. Click **"Account details"**
4. Click **"Show private key"**
5. Enter your MetaMask password
6. Copy the private key (without the `0x` prefix)

## Step 4: Configure Your .env File

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your real values:

```env
# Your RPC URL from Alchemy or Infura
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Your wallet private key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: For contract verification on Etherscan
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Step 5: Deploy the V1 Proxy

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia
```

## Step 6: Verify on Etherscan (Optional)

Verification makes your source code public and allows users to interact with your contract directly on Etherscan.

1. Get an Etherscan API key from https://etherscan.io/myapikey
2. Add it to your `.env` file
3. Run verification:

```bash
npx hardhat verify --network sepolia <IMPLEMENTATION_ADDRESS>
```

> [!NOTE]
> If you see an error saying "Failed to verify ERC1967Proxy contract... Already Verified", this is expected! It means the proxy structure itself is already known by Etherscan. The important part is that your implementation contract is verified and linked.

Once verified, view your contract at:
`https://sepolia.etherscan.io/address/YOUR_PROXY_ADDRESS`

## Step 7: Use the Frontend with Sepolia

After deployment, the `contract-abi.sepolia.json` file is automatically created in your `frontend/` folder.

1. Open the frontend at `http://localhost:3000` (or you can run the docker container as it is already configured to run the frontend with Sepolia)
2. Switch MetaMask to **Sepolia Test Network**
3. Connect your wallet
4. Start donating with real Sepolia ETH!

---

# Upgrading to V2

The contract uses the **UUPS (Universal Upgradeable Proxy Standard)** pattern. This allows you to upgrade the contract logic without changing the proxy address or losing any data.

## How to Upgrade

To upgrade an existing V1 deployment to V2:

```bash
# Local Hardhat
npm run upgrade:local

# Inside the docker container
docker compose run --rm deployer npm run upgrade:docker

# Sepolia Testnet
npm run upgrade:sepolia
```

## What the Upgrade Script Does

1. **Loads the existing proxy address** from `deployments/`
2. **Deploys the new V2 implementation** contract
3. **Calls `upgradeProxy()`** to swap the logic
4. **Verifies by calling `getVersion()`** - returns "v2.0.0"
5. **Updates the frontend ABI** with V2 functions

### V2 Features

| Function | Description |
|----------|-------------|
| `getVersion()` | Returns the hardcoded version string "v2.0.0" |
| `contractVersion()` | State variable for custom version string |
| `setVersion(string)` | Admin-only: set a custom version |

## Reset Project (Start Fresh)

If you ever see errors like "Deployment not registered" or "doesn't look like an ERC 1967 proxy", it usually means your local files are out of sync with a fresh blockchain. You can start completely fresh with:

```bash
npm run reset:docker
```
*Note: This wipes all local donations and charity proposals.*

---

# Security Features

- **Reentrancy Guard** - Prevents reentrancy attacks on `donate()` and `withdrawFunds()`
- **Checks-Effects-Interactions** - State updates before external calls
- **Access Control** - Role-based permissions for admin functions
- **UUPS Proxy** - Upgrades require admin authorization via `_authorizeUpgrade()`

## Pull over Push Pattern

Instead of automatically sending donations to charities, funds accumulate in the contract. Charities must manually withdraw their funds:

1. Connect MetaMask with the charity's registered wallet address
2. Click **"Withdraw Funds"** on your charity card
3. Confirm the transaction

This prevents reentrancy attacks and ensures reliable donation processing.

---

# NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile all Solidity contracts |
| `npm run test` | Run all tests (V1 + V2) |
| `npm run node` | Start a local Hardhat node |
| `npm run deploy:local` | Deploy V1 proxy to localhost |
| `npm run deploy:docker` | Deploy V1 proxy inside Docker |
| `npm run deploy:sepolia` | Deploy V1 proxy to Sepolia |
| `npm run upgrade:local` | Upgrade to V2 on localhost |
| `npm run upgrade:docker` | Upgrade to V2 inside Docker |
| `npm run upgrade:sepolia` | Upgrade to V2 on Sepolia |
| `npm run clean:docker` | Remove project Docker containers, images, and volumes |
| `npm run reset:docker` | Fully reset the Docker environment and redeploy |

---

# Troubleshooting

## MetaMask Nonce Issues

If you restart Hardhat node, MetaMask may have stale transaction data:

1. Open **MetaMask** → **Settings** → **Advanced**
2. Click **"Clear activity tab data"**

## Wrong Network Error

If you see "CALL_EXCEPTION" or "Connection Failed":
- Switch MetaMask to the correct network (Sepolia or Hardhat Local)
- Ensure the RPC URL is accessible

## "GoChain Testnet" Warning

When adding Chain ID `31337`, MetaMask may suggest "GoChain Testnet". This is a known ID collision with Hardhat. Simply rename it to "Hardhat Local".

---

# Share Remotely with Cloudflare Tunnel

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