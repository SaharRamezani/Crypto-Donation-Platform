/**
 * Crypto Donation Platform - Frontend Application
 * Uses ethers.js for blockchain interaction
 */

// ============ Configuration ============
const CONFIG = {
    // Default contract address (update after deployment)
    contractAddress: null,

    // Sepolia Chain ID
    sepoliaChainId: '0xaa36a7', // 11155111 in hex

    // Network names
    networks: {
        '0x1': 'Ethereum Mainnet',
        '0xaa36a7': 'Sepolia Testnet',
        '0x539': 'Localhost',
        '0x7a69': 'Hardhat'
    },

    // Charity icons based on name keywords
    charityIcons: {
        'red cross': '🏥',
        'unicef': '👶',
        'doctors': '⚕️',
        'wildlife': '🐾',
        'children': '👧',
        'food': '🍞',
        'education': '📚',
        'environment': '🌍',
        'water': '💧',
        'health': '❤️',
        'default': '🎗️'
    }
};

// Contract ABI (will be loaded from file or hardcoded)
const CONTRACT_ABI = [
    // Events
    "event DonationReceived(address indexed donor, uint256 indexed charityId, uint256 amount, uint256 timestamp)",
    "event CharityProposed(address indexed proposer, string name, address walletAddress, uint256 proposalId)",
    "event CharityApproved(uint256 indexed charityId, string name, address walletAddress)",
    "event CharityRejected(uint256 indexed proposalId, string name)",
    "event FundsWithdrawn(uint256 indexed charityId, address indexed recipient, uint256 amount)",
    "event CharityStatusChanged(uint256 indexed charityId, bool isActive)",

    // Read functions
    "function owner() view returns (address)",
    "function charityCount() view returns (uint256)",
    "function proposalCount() view returns (uint256)",
    "function totalDonations() view returns (uint256)",
    "function getCharities() view returns (tuple(uint256 id, string name, string description, address walletAddress, uint256 totalReceived, bool isActive)[])",
    "function getActiveCharities() view returns (tuple(uint256 id, string name, string description, address walletAddress, uint256 totalReceived, bool isActive)[])",
    "function getPendingProposals() view returns (tuple(uint256 id, string name, string description, address walletAddress, address proposer, bool isProcessed, bool isApproved)[])",
    "function getDonorLeaderboard(uint256 limit) view returns (tuple(address donorAddress, uint256 totalDonated)[])",
    "function getRecentDonations(uint256 limit) view returns (tuple(address donor, uint256 charityId, uint256 amount, uint256 timestamp)[])",
    "function getDonorTotal(address donor) view returns (uint256)",
    "function getContractBalance() view returns (uint256)",
    "function isOwner(address addr) view returns (bool)",
    "function charityBalances(uint256 charityId) view returns (uint256)",

    // Write functions
    "function donate(uint256 charityId) payable",
    "function proposeCharity(string name, string description, address walletAddress)",
    "function approveCharity(uint256 proposalId)",
    "function rejectCharity(uint256 proposalId)",
    "function withdrawFunds(uint256 charityId)",
    "function toggleCharityStatus(uint256 charityId)"
];

// ============ State ============
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let isOwner = false;
let charities = [];

// ============ DOM Elements ============
const elements = {
    connectWallet: document.getElementById('connectWallet'),
    walletInfo: document.getElementById('walletInfo'),
    walletAddress: document.getElementById('walletAddress'),
    walletBalance: document.getElementById('walletBalance'),
    networkBadge: document.getElementById('networkBadge'),
    networkName: document.getElementById('networkName'),

    totalDonated: document.getElementById('totalDonated'),
    totalCharities: document.getElementById('totalCharities'),
    totalDonors: document.getElementById('totalDonors'),

    charitiesGrid: document.getElementById('charitiesGrid'),
    leaderboardBody: document.getElementById('leaderboardBody'),
    leaderboardEmpty: document.getElementById('leaderboardEmpty'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),

    donationModal: document.getElementById('donationModal'),
    closeDonationModal: document.getElementById('closeDonationModal'),
    selectedCharityName: document.getElementById('selectedCharityName'),
    donationAmount: document.getElementById('donationAmount'),
    confirmDonation: document.getElementById('confirmDonation'),

    proposeForm: document.getElementById('proposeForm'),
    charityName: document.getElementById('charityName'),
    charityDescription: document.getElementById('charityDescription'),
    charityWallet: document.getElementById('charityWallet'),

    adminPanel: document.getElementById('adminPanel'),
    pendingProposals: document.getElementById('pendingProposals'),
    noProposals: document.getElementById('noProposals'),

    contractAddress: document.getElementById('contractAddress'),
    viewContract: document.getElementById('viewContract'),

    toastContainer: document.getElementById('toastContainer')
};

// ============ Initialization ============
document.addEventListener('DOMContentLoaded', async () => {
    initializeParticles();
    initializeEventListeners();
    await loadContractConfig();

    // Check if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
    } else {
        // Load demo data if not connected
        loadDemoData();
    }
});

async function loadContractConfig() {
    try {
        const response = await fetch('contract-abi.json');
        if (response.ok) {
            const config = await response.json();
            CONFIG.contractAddress = config.address;
            CONFIG.loadedChainId = config.chainId;

            // Use the full ABI from the JSON file if available
            if (config.abi) {
                CONFIG.contractABI = config.abi;
            }

            // Update footer based on network
            if (config.address) {
                elements.contractAddress.textContent = shortenAddress(config.address);
                // Show Etherscan link for Sepolia, nothing for local
                if (config.chainId === 11155111) {
                    elements.viewContract.href = `https://sepolia.etherscan.io/address/${config.address}`;
                } else {
                    elements.viewContract.href = '#';
                }
            }

            console.log(`Loaded contract: ${config.address} on ${config.network} (chain ${config.chainId})`);
        }
    } catch (error) {
        console.log('No contract config found, using demo mode');
    }
}

function initializeParticles() {
    const particles = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(99, 102, 241, ${Math.random() * 0.3});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 20 + 10}s infinite ease-in-out;
        `;
        particles.appendChild(particle);
    }

    // Add float animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(-10px) translateX(-10px); }
            75% { transform: translateY(-30px) translateX(5px); }
        }
    `;
    document.head.appendChild(style);
}

function initializeEventListeners() {
    // Wallet connection
    elements.connectWallet.addEventListener('click', connectWallet);

    // Donation modal
    elements.closeDonationModal.addEventListener('click', closeDonationModal);
    elements.donationModal.addEventListener('click', (e) => {
        if (e.target === elements.donationModal) closeDonationModal();
    });

    // Quick amount buttons
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.donationAmount.value = btn.dataset.amount;
        });
    });

    // Confirm donation
    elements.confirmDonation.addEventListener('click', confirmDonation);

    // Propose charity form
    elements.proposeForm.addEventListener('submit', proposeCharity);

    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
}

// ============ Wallet Connection ============
async function connectWallet() {
    if (!window.ethereum) {
        showToast('error', 'MetaMask Required', 'Please install MetaMask to use this dApp');
        return;
    }

    try {
        elements.connectWallet.disabled = true;
        elements.connectWallet.innerHTML = '<span class="btn-icon">⏳</span> Connecting...';

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }

        userAddress = accounts[0];

        // Setup provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Get network
        const network = await provider.getNetwork();
        const chainId = '0x' + network.chainId.toString(16);

        console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
        console.log('Contract address:', CONFIG.contractAddress);

        // Check if on a supported network (Sepolia or local Hardhat)
        const isSepolia = network.chainId === 11155111;
        const isLocalHardhat = network.chainId === 31337;

        if (!isSepolia && !isLocalHardhat) {
            showToast('error', 'Wrong Network', `Please switch MetaMask to Sepolia or Hardhat Local. Current: ${network.name || 'Chain ' + network.chainId}`);
            elements.connectWallet.disabled = false;
            elements.connectWallet.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet';
            return;
        }

        // Reload config if it doesn't match the current network
        if (CONFIG.loadedChainId !== network.chainId) {
            console.log('Config chain mismatch, reloading config for chain:', network.chainId);
            await loadContractConfig();
        }

        // Update UI
        updateWalletUI(accounts[0], chainId);

        // Initialize contract if address is available
        if (CONFIG.contractAddress) {
            const abi = CONFIG.contractABI || CONTRACT_ABI;
            contract = new ethers.Contract(CONFIG.contractAddress, abi, signer);

            // Check if user is owner
            try {
                isOwner = await contract.isOwner(userAddress);
            } catch (ownerError) {
                console.error('isOwner check failed:', ownerError);
                isOwner = false;
            }

            // Show admin panel if owner
            if (isOwner) {
                elements.adminPanel.classList.remove('hidden');
            }

            // Load data
            await loadAllData();

            // Setup event listeners
            setupContractEventListeners();
        } else {
            showToast('warning', 'Demo Mode', 'Contract not deployed. Showing demo data.');
            loadDemoData();
        }

    } catch (error) {
        console.error('Connection error:', error);
        showToast('error', 'Connection Failed', error.message);
        elements.connectWallet.disabled = false;
        elements.connectWallet.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet';
    }
}

function updateWalletUI(address, chainId) {
    elements.connectWallet.classList.add('hidden');
    elements.walletInfo.classList.remove('hidden');
    elements.networkBadge.classList.remove('hidden');

    elements.walletAddress.textContent = shortenAddress(address);
    elements.networkName.textContent = CONFIG.networks[chainId] || 'Unknown Network';

    // Get balance
    provider.getBalance(address).then(balance => {
        elements.walletBalance.textContent = `${parseFloat(ethers.utils.formatEther(balance)).toFixed(4)} ETH`;
    });
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // Disconnected
        location.reload();
    } else if (accounts[0] !== userAddress) {
        userAddress = accounts[0];
        location.reload();
    }
}

function handleChainChanged() {
    location.reload();
}

// ============ Data Loading ============
async function loadAllData() {
    try {
        await Promise.all([
            loadCharities(),
            loadStats(),
            loadLeaderboard(),
            loadHistory()
        ]);

        if (isOwner) {
            await loadPendingProposals();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('error', 'Load Error', 'Failed to load blockchain data');
    }
}

async function loadCharities() {
    try {
        charities = await contract.getActiveCharities();
        renderCharities(charities);
    } catch (error) {
        console.error('Error loading charities:', error);
    }
}

async function loadStats() {
    try {
        const [totalDonations, charityCount] = await Promise.all([
            contract.totalDonations(),
            contract.charityCount()
        ]);

        const leaderboard = await contract.getDonorLeaderboard(100);

        elements.totalDonated.textContent = parseFloat(ethers.utils.formatEther(totalDonations)).toFixed(4);
        elements.totalCharities.textContent = charityCount.toString();
        elements.totalDonors.textContent = leaderboard.length.toString();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadLeaderboard() {
    try {
        const leaderboard = await contract.getDonorLeaderboard(10);
        renderLeaderboard(leaderboard);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

async function loadHistory() {
    try {
        const donations = await contract.getRecentDonations(20);
        renderHistory(donations);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function loadPendingProposals() {
    try {
        const proposals = await contract.getPendingProposals();
        renderProposals(proposals);
    } catch (error) {
        console.error('Error loading proposals:', error);
    }
}

// ============ Rendering ============
function renderCharities(charityList) {
    if (charityList.length === 0) {
        elements.charitiesGrid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🏛️</span>
                <p>No charities available</p>
            </div>
        `;
        return;
    }

    elements.charitiesGrid.innerHTML = charityList.map(charity => `
        <div class="charity-card" data-id="${charity.id}">
            <div class="charity-header">
                <div class="charity-icon">${getCharityIcon(charity.name)}</div>
                <div class="charity-info">
                    <h3 class="charity-name">${escapeHtml(charity.name)}</h3>
                </div>
            </div>
            <p class="charity-description">${escapeHtml(charity.description)}</p>
            <p class="charity-wallet">Wallet: ${shortenAddress(charity.walletAddress)}</p>
            <button class="btn btn-primary btn-full donate-btn" data-id="${charity.id}" data-name="${escapeHtml(charity.name)}">
                <span class="btn-icon">💝</span> Donate
            </button>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.donate-btn').forEach(btn => {
        btn.addEventListener('click', () => openDonationModal(btn.dataset.id, btn.dataset.name));
    });
}

function renderLeaderboard(leaderboard) {
    if (leaderboard.length === 0) {
        elements.leaderboardBody.innerHTML = '';
        elements.leaderboardEmpty.classList.remove('hidden');
        return;
    }

    elements.leaderboardEmpty.classList.add('hidden');
    elements.leaderboardBody.innerHTML = leaderboard.map((donor, index) => `
        <tr>
            <td>
                <span class="rank-badge ${getRankClass(index + 1)}">${index + 1}</span>
            </td>
            <td>
                <span class="donor-address">${shortenAddress(donor.donorAddress)}</span>
            </td>
            <td>
                <span class="donation-amount">${parseFloat(ethers.utils.formatEther(donor.totalDonated)).toFixed(4)} ETH</span>
            </td>
        </tr>
    `).join('');
}

function renderHistory(donations) {
    if (donations.length === 0) {
        elements.historyList.innerHTML = '';
        elements.historyEmpty.classList.remove('hidden');
        return;
    }

    elements.historyEmpty.classList.add('hidden');
    elements.historyList.innerHTML = donations.map(donation => {
        const charity = charities.find(c => c.id.eq(donation.charityId));
        const charityName = charity ? charity.name : `Charity #${donation.charityId}`;
        const date = new Date(donation.timestamp.toNumber() * 1000);

        return `
            <div class="history-item">
                <div class="history-icon">💎</div>
                <div class="history-details">
                    <div class="history-main">
                        <span class="history-donor">${shortenAddress(donation.donor)}</span>
                        <span class="history-arrow">→</span>
                        <span class="history-charity">${escapeHtml(charityName)}</span>
                    </div>
                    <div class="history-meta">${formatDate(date)}</div>
                </div>
                <div class="history-amount">${parseFloat(ethers.utils.formatEther(donation.amount)).toFixed(4)} ETH</div>
            </div>
        `;
    }).join('');
}

function renderProposals(proposals) {
    if (proposals.length === 0) {
        elements.pendingProposals.innerHTML = '';
        elements.noProposals.classList.remove('hidden');
        return;
    }

    elements.noProposals.classList.add('hidden');
    elements.pendingProposals.innerHTML = proposals.map(proposal => `
        <div class="proposal-card" data-id="${proposal.id}">
            <div class="proposal-header">
                <span class="proposal-id">ID: ${proposal.id}</span>
                <span class="proposal-status">Pending</span>
            </div>
            <h3 class="proposal-name">${escapeHtml(proposal.name)}</h3>
            <p class="proposal-description">${escapeHtml(proposal.description)}</p>
            <p class="proposal-wallet">Wallet: ${proposal.walletAddress}</p>
            <p class="proposal-proposer">Proposed by: ${shortenAddress(proposal.proposer)}</p>
            <div class="proposal-actions">
                <button class="btn btn-success approve-btn" data-id="${proposal.id}">
                    ✅ Approve
                </button>
                <button class="btn btn-danger reject-btn" data-id="${proposal.id}">
                    ❌ Reject
                </button>
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => approveProposal(btn.dataset.id));
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectProposal(btn.dataset.id));
    });
}

// ============ Donation Functions ============
let selectedCharityId = null;

function openDonationModal(charityId, charityName) {
    if (!signer) {
        showToast('warning', 'Wallet Required', 'Please connect your wallet first');
        return;
    }

    selectedCharityId = charityId;
    elements.selectedCharityName.textContent = charityName;
    elements.donationAmount.value = '';
    elements.donationModal.classList.add('active');
}

function closeDonationModal() {
    elements.donationModal.classList.remove('active');
    selectedCharityId = null;
}

async function confirmDonation() {
    if (!selectedCharityId) return;

    const amount = elements.donationAmount.value;
    if (!amount || parseFloat(amount) <= 0) {
        showToast('error', 'Invalid Amount', 'Please enter a valid donation amount');
        return;
    }

    try {
        elements.confirmDonation.disabled = true;
        elements.confirmDonation.innerHTML = '<span class="btn-icon">⏳</span> Processing...';

        const tx = await contract.donate(selectedCharityId, {
            value: ethers.utils.parseEther(amount)
        });

        showToast('info', 'Transaction Sent', 'Waiting for confirmation...');

        await tx.wait();

        showToast('success', 'Donation Successful! 🎉', `You donated ${amount} ETH`);
        closeDonationModal();

        // Reload data
        await loadAllData();

    } catch (error) {
        console.error('Donation error:', error);
        showToast('error', 'Donation Failed', error.reason || error.message);
    } finally {
        elements.confirmDonation.disabled = false;
        elements.confirmDonation.innerHTML = '<span class="btn-icon">💎</span> Confirm Donation';
    }
}

// ============ Proposal Functions ============
async function proposeCharity(e) {
    e.preventDefault();

    if (!signer) {
        showToast('warning', 'Wallet Required', 'Please connect your wallet first');
        return;
    }

    const name = elements.charityName.value.trim();
    const description = elements.charityDescription.value.trim();
    const wallet = elements.charityWallet.value.trim();

    if (!ethers.utils.isAddress(wallet)) {
        showToast('error', 'Invalid Address', 'Please enter a valid Ethereum address');
        return;
    }

    try {
        const submitBtn = elements.proposeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Submitting...';

        const tx = await contract.proposeCharity(name, description, wallet);

        showToast('info', 'Transaction Sent', 'Waiting for confirmation...');

        await tx.wait();

        showToast('success', 'Proposal Submitted! 📝', 'Your charity proposal is pending approval');

        // Reset form
        elements.proposeForm.reset();

    } catch (error) {
        console.error('Proposal error:', error);
        showToast('error', 'Proposal Failed', error.reason || error.message);
    } finally {
        const submitBtn = elements.proposeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">📝</span> Submit Proposal';
    }
}

async function approveProposal(proposalId) {
    try {
        const btn = document.querySelector(`.approve-btn[data-id="${proposalId}"]`);
        btn.disabled = true;
        btn.textContent = '⏳ Processing...';

        const tx = await contract.approveCharity(proposalId);
        await tx.wait();

        showToast('success', 'Charity Approved! ✅', 'The charity has been added');
        await loadAllData();
        await loadPendingProposals();

    } catch (error) {
        console.error('Approval error:', error);
        showToast('error', 'Approval Failed', error.reason || error.message);
    }
}

async function rejectProposal(proposalId) {
    try {
        const btn = document.querySelector(`.reject-btn[data-id="${proposalId}"]`);
        btn.disabled = true;
        btn.textContent = '⏳ Processing...';

        const tx = await contract.rejectCharity(proposalId);
        await tx.wait();

        showToast('success', 'Proposal Rejected', 'The proposal has been rejected');
        await loadPendingProposals();

    } catch (error) {
        console.error('Rejection error:', error);
        showToast('error', 'Rejection Failed', error.reason || error.message);
    }
}

// ============ Contract Events ============
function setupContractEventListeners() {
    contract.on('DonationReceived', (donor, charityId, amount, timestamp) => {
        console.log('Donation received:', { donor, charityId: charityId.toString(), amount: ethers.utils.formatEther(amount) });

        if (donor.toLowerCase() !== userAddress.toLowerCase()) {
            showToast('info', 'New Donation!', `Someone donated ${parseFloat(ethers.utils.formatEther(amount)).toFixed(4)} ETH`);
        }

        // Reload data
        loadAllData();
    });

    contract.on('CharityApproved', (charityId, name) => {
        console.log('Charity approved:', { charityId: charityId.toString(), name });
        showToast('info', 'New Charity Added', `${name} is now accepting donations!`);
        loadCharities();
    });
}

// ============ Demo Data ============
function loadDemoData() {
    // Demo charities
    const demoCharities = [
        { id: { eq: () => true, toString: () => '1' }, name: 'Red Cross', description: 'Humanitarian aid and disaster relief worldwide', walletAddress: '0x1111111111111111111111111111111111111111', totalReceived: { toString: () => '2500000000000000000' }, isActive: true },
        { id: { eq: () => true, toString: () => '2' }, name: 'UNICEF', description: "Children's rights and development advocacy", walletAddress: '0x2222222222222222222222222222222222222222', totalReceived: { toString: () => '1800000000000000000' }, isActive: true },
        { id: { eq: () => true, toString: () => '3' }, name: 'Doctors Without Borders', description: 'Medical care in crisis zones', walletAddress: '0x3333333333333333333333333333333333333333', totalReceived: { toString: () => '3200000000000000000' }, isActive: true },
        { id: { eq: () => true, toString: () => '4' }, name: 'World Wildlife Fund', description: 'Conservation and environmental protection', walletAddress: '0x4444444444444444444444444444444444444444', totalReceived: { toString: () => '950000000000000000' }, isActive: true },
        { id: { eq: () => true, toString: () => '5' }, name: 'Save the Children', description: 'Child welfare and education support', walletAddress: '0x5555555555555555555555555555555555555555', totalReceived: { toString: () => '1500000000000000000' }, isActive: true }
    ];

    // Mock ethers utilities for demo
    const mockFormatEther = (val) => {
        const str = typeof val === 'object' ? val.toString() : val;
        return (parseInt(str) / 1e18).toString();
    };

    // Save original for later use
    charities = demoCharities;

    // Render demo data
    elements.charitiesGrid.innerHTML = demoCharities.map(charity => `
        <div class="charity-card" data-id="${charity.id.toString()}">
            <div class="charity-header">
                <div class="charity-icon">${getCharityIcon(charity.name)}</div>
                <div class="charity-info">
                    <h3 class="charity-name">${escapeHtml(charity.name)}</h3>
                </div>
            </div>
            <p class="charity-description">${escapeHtml(charity.description)}</p>
            <p class="charity-wallet">Wallet: ${shortenAddress(charity.walletAddress)}</p>
            <button class="btn btn-primary btn-full donate-btn" data-id="${charity.id.toString()}" data-name="${escapeHtml(charity.name)}">
                <span class="btn-icon">💝</span> Donate
            </button>
        </div>
    `).join('');

    // Demo stats
    elements.totalDonated.textContent = '9.95';
    elements.totalCharities.textContent = '5';
    elements.totalDonors.textContent = '23';

    // Demo leaderboard
    const demoLeaderboard = [
        { donorAddress: '0xAbC123...F456', totalDonated: '3.5' },
        { donorAddress: '0xDeF789...B012', totalDonated: '2.1' },
        { donorAddress: '0x456Abc...D789', totalDonated: '1.8' },
        { donorAddress: '0x789Def...A456', totalDonated: '1.2' },
        { donorAddress: '0xBcd012...E789', totalDonated: '0.85' }
    ];

    elements.leaderboardEmpty.classList.add('hidden');
    elements.leaderboardBody.innerHTML = demoLeaderboard.map((donor, index) => `
        <tr>
            <td>
                <span class="rank-badge ${getRankClass(index + 1)}">${index + 1}</span>
            </td>
            <td>
                <span class="donor-address">${donor.donorAddress}</span>
            </td>
            <td>
                <span class="donation-amount">${donor.totalDonated} ETH</span>
            </td>
        </tr>
    `).join('');

    // Demo history
    const demoHistory = [
        { donor: '0xAbC123...F456', charityName: 'Red Cross', amount: '0.5', time: '2 minutes ago' },
        { donor: '0xDeF789...B012', charityName: 'UNICEF', amount: '0.25', time: '15 minutes ago' },
        { donor: '0x456Abc...D789', charityName: 'Doctors Without Borders', amount: '1.0', time: '1 hour ago' },
        { donor: '0xBcd012...E789', charityName: 'World Wildlife Fund', amount: '0.1', time: '3 hours ago' }
    ];

    elements.historyEmpty.classList.add('hidden');
    elements.historyList.innerHTML = demoHistory.map(donation => `
        <div class="history-item">
            <div class="history-icon">💎</div>
            <div class="history-details">
                <div class="history-main">
                    <span class="history-donor">${donation.donor}</span>
                    <span class="history-arrow">→</span>
                    <span class="history-charity">${donation.charityName}</span>
                </div>
                <div class="history-meta">${donation.time}</div>
            </div>
            <div class="history-amount">${donation.amount} ETH</div>
        </div>
    `).join('');

    // Add click handlers for demo
    document.querySelectorAll('.donate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showToast('warning', 'Demo Mode', 'Connect your wallet to make real donations');
        });
    });
}

// ============ Utility Functions ============
function shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCharityIcon(name) {
    const nameLower = name.toLowerCase();
    for (const [keyword, icon] of Object.entries(CONFIG.charityIcons)) {
        if (nameLower.includes(keyword)) {
            return icon;
        }
    }
    return CONFIG.charityIcons.default;
}

function getRankClass(rank) {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-default';
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
}

// ============ Toast Notifications ============
function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    elements.toastContainer.appendChild(toast);

    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
