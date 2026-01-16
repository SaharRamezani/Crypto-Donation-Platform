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

### Install Dependencies

```bash
npm install
```

### Compile Contract

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy Locally

Start a local Hardhat node:
```bash
npx hardhat node
```

In another terminal, deploy:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Deploy with Docker

Start all services with Docker Compose:
```bash
# Start Docker daemon first (may need sudo)
sudo systemctl start docker

# Then run:
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

### Deploy to Sepolia

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

### Run Frontend

Open `frontend/index.html` in a web browser. The frontend works in:
- **Demo Mode** - Without MetaMask, shows sample data
- **Live Mode** - With MetaMask connected to Sepolia

Run the frontend server:
```bash
cd frontend
python3 -m http.server 3000
```

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