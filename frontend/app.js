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
        'unicef': '👶',
        'default': '❤️'
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

    "function charityBalances(uint256 charityId) view returns (uint256)",

    // Read functions
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

    // Write functions
    "function donate(uint256 charityId) payable",
    "function proposeCharity(string name, string description, address walletAddress)",
    "function approveCharity(uint256 proposalId)",
    "function rejectCharity(uint256 proposalId)",
    "function withdrawFunds(uint256 charityId)",
    "function toggleCharityStatus(uint256 charityId)",

    // Role Management
    "function grantRole(bytes32 role, address account)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function ADMIN_ROLE() view returns (bytes32)",

    // V2 Functions
    "function getVersion() view returns (string)",
    "function contractVersion() view returns (string)",
    "function setVersion(string memory version)",
    "event VersionUpdated(string oldVersion, string newVersion)"
];

const ROLES = {
    DEFAULT_ADMIN: '0x0000000000000000000000000000000000000000000000000000000000000000',
    ADMIN: null // Will be loaded from contract
};

// ============ State ============
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let isOwner = false;
let isSuperAdmin = false;
let charities = [];
let currentTheme = 'light';

// ============ DOM Elements ============
const elements = {
    connectWallet: document.getElementById('connectWallet'),
    walletInfo: document.getElementById('walletInfo'),
    walletAddress: document.getElementById('walletAddress'),
    walletBalance: document.getElementById('walletBalance'),
    disconnectWallet: document.getElementById('disconnectWallet'),
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
    installModal: document.getElementById('installModal'),
    closeInstallModal: document.getElementById('closeInstallModal'),
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

    adminToggle: document.getElementById('adminToggle'),
    mainView: document.getElementById('mainView'),
    adminView: document.getElementById('adminView'),

    roleManagement: document.getElementById('roleManagement'),
    grantRoleForm: document.getElementById('grantRoleForm'),
    adminAddress: document.getElementById('adminAddress'),

    contractAddress: document.getElementById('contractAddress'),
    viewContract: document.getElementById('viewContract'),

    themeToggle: document.getElementById('themeToggle'),
    toastContainer: document.getElementById('toastContainer'),

    // Debug Elements
    debugNetwork: document.getElementById('debugNetwork'),
    debugChainId: document.getElementById('debugChainId'),
    debugAccount: document.getElementById('debugAccount'),

    // Version Badge
    versionBadge: document.getElementById('versionBadge')
};

// ============ Initialization ============
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    initializeEventListeners();
    await loadContractConfig();

    // Initialize provider and load data even if not connected
    await setupProvider();
    await loadAllData();

    // Check if already connected via MetaMask
    if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
    }
});

async function setupProvider() {
    // If we already have a provider (e.g. from connectWallet), don't override
    if (provider) return;

    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
        // Fallback to read-only provider
        // If Sepolia (11155111), use a public RPC. Otherwise assume local (8545)
        const rpcUrl = (CONFIG.loadedChainId === 11155111)
            ? 'https://ethereum-sepolia-rpc.publicnode.com'
            : 'http://localhost:8545';

        console.log(`No MetaMask detected. Using read-only fallback: ${rpcUrl}`);
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }

    // Initialize contract with the provider (read-only)
    if (CONFIG.contractAddress) {
        const abi = CONFIG.contractABI || CONTRACT_ABI;
        contract = new ethers.Contract(CONFIG.contractAddress, abi, provider);
    }

    // Initialize Debug UI from provider if available
    // Add timeout to prevent hanging if provider is unreachable
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network detection timeout')), 5000)
        );
        const network = await Promise.race([provider.getNetwork(), timeoutPromise]);
        const chainIdHex = '0x' + network.chainId.toString(16);
        const networkName = CONFIG.networks[chainIdHex] || network.name || 'Unknown';

        if (elements.debugChainId) elements.debugChainId.textContent = network.chainId;
        if (elements.debugNetwork) elements.debugNetwork.textContent = networkName;
    } catch (e) {
        console.warn('Could not detect network:', e.message);
        // Set fallback debug info
        if (elements.debugNetwork) elements.debugNetwork.textContent = 'Offline';
        if (elements.debugChainId) elements.debugChainId.textContent = 'N/A';
    }
}

async function loadContractConfig(chainId = null) {
    try {
        // If no chainId provided, try to detect from window.ethereum
        if (!chainId && window.ethereum) {
            try {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                chainId = parseInt(chainIdHex, 16);
            } catch (e) {
                console.log('Could not detect network for config loading');
            }
        }

        // If still no chainId (no MetaMask), default to Sepolia for public access
        if (!chainId) {
            console.log('No wallet detected, defaulting to Sepolia config for read-only access');
            chainId = 11155111; // Sepolia
        }

        // Use sepolia-specific config if we're on Sepolia
        const configFile = (chainId === 11155111) ? 'contract-abi.sepolia.json' : 'contract-abi.json';
        console.log(`Fetching config: ${configFile}`);

        const response = await fetch(configFile);
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

            console.log(`✅ Loaded contract: ${config.address} on ${config.network} (chain ${config.chainId})`);
        } else {
            console.warn(`⚠️ Could not load config file: ${configFile} (Status: ${response.status})`);
            CONFIG.contractAddress = null; // Reset if fetch fails
        }
    } catch (error) {
        console.log('No contract config found, using demo mode');
    }
}

function initializeEventListeners() {
    // Wallet connection
    elements.connectWallet.addEventListener('click', connectWallet);
    elements.disconnectWallet.addEventListener('click', disconnectWallet);

    // View Switching
    elements.adminToggle.addEventListener('click', () => {
        const isCurrentlyAdmin = !elements.adminView.classList.contains('hidden');
        switchView(isCurrentlyAdmin ? 'main' : 'admin');
    });

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Donation modal
    elements.closeDonationModal.addEventListener('click', closeDonationModal);
    elements.donationModal.addEventListener('click', (e) => {
        if (e.target === elements.donationModal) closeDonationModal();
    });

    // Install modal
    elements.closeInstallModal.addEventListener('click', closeInstallModal);
    elements.installModal.addEventListener('click', (e) => {
        if (e.target === elements.installModal) closeInstallModal();
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

    // Grant role form
    elements.grantRoleForm.addEventListener('submit', grantAdminRole);

    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
}

// ============ Wallet Connection ============
async function connectWallet() {
    if (!window.ethereum) {
        showMetaMaskInstallPrompt();
        showToast('warning', 'MetaMask Required', 'Please install MetaMask to make donations');
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
        console.log('Contract address (Proxy):', CONFIG.contractAddress);
        console.log('Connected Address:', userAddress);

        // Check if on a supported network (Sepolia or local Hardhat)
        const isSepolia = network.chainId === 11155111;
        const isLocalHardhat = network.chainId === 31337;

        if (!isSepolia && !isLocalHardhat) {
            showToast('error', 'Wrong Network', `Please switch MetaMask to Sepolia or Hardhat Local. Current: ${network.name || 'Chain ' + network.chainId}`);
            elements.connectWallet.disabled = false;
            elements.connectWallet.innerHTML = 'Connect Wallet';
            return;
        }

        // Reload config if it doesn't match the current network
        if (CONFIG.loadedChainId !== network.chainId) {
            console.log('Config chain mismatch, reloading config for chain:', network.chainId);
            await loadContractConfig(network.chainId);
        }

        // Update UI
        updateWalletUI(accounts[0], chainId);

        // Update Debug UI
        const networkName = CONFIG.networks[chainId] || network.name || 'Unknown';
        if (elements.debugAccount) elements.debugAccount.textContent = shortenAddress(accounts[0]);
        if (elements.debugChainId) elements.debugChainId.textContent = network.chainId;
        if (elements.debugNetwork) elements.debugNetwork.textContent = networkName;

        // Initialize contract if address is available
        if (CONFIG.contractAddress) {
            const abi = CONFIG.contractABI || CONTRACT_ABI;
            contract = new ethers.Contract(CONFIG.contractAddress, abi, signer);

            // Fetch role identifiers
            try {
                ROLES.ADMIN = await contract.ADMIN_ROLE();
            } catch (roleError) {
                console.error('Failed to fetch ADMIN_ROLE identifier:', roleError);
                // Fallback to keccak256("ADMIN_ROLE") if contract call fails
                ROLES.ADMIN = ethers.utils.id("ADMIN_ROLE");
            }

            // Check if user is owner (ADMIN_ROLE) or super admin (DEFAULT_ADMIN_ROLE)
            try {
                console.log('Checking roles for:', userAddress);
                console.log('ADMIN_ROLE:', ROLES.ADMIN);
                console.log('DEFAULT_ADMIN_ROLE:', ROLES.DEFAULT_ADMIN);

                // Use checksummed address just in case
                const checksummedAddress = ethers.utils.getAddress(userAddress);

                const [isAdmin, superAdmin] = await Promise.all([
                    contract.hasRole(ROLES.ADMIN, checksummedAddress),
                    contract.hasRole(ROLES.DEFAULT_ADMIN, checksummedAddress)
                ]);

                console.log('isAdmin result:', isAdmin);
                console.log('isSuperAdmin result:', superAdmin);

                isOwner = isAdmin || superAdmin;
                isSuperAdmin = superAdmin;
            } catch (ownerError) {
                console.error('Role check failed:', ownerError);
                isOwner = false;
                isSuperAdmin = false;
            }

            // Show admin panel if admin
            if (isOwner) {
                elements.adminToggle.classList.remove('hidden');
                elements.adminPanel.classList.remove('hidden');
            }

            // Show role management only if super admin
            if (isSuperAdmin) {
                elements.roleManagement.classList.remove('hidden');
            }

            // Load data
            await loadAllData();

            // Setup event listeners
            setupContractEventListeners();
        } else {
            const networkName = isSepolia ? 'Sepolia' : (isLocalHardhat ? 'Hardhat' : 'this network');
            showToast('warning', 'Not Deployed', `No contract found on ${networkName}. Click here to switch to Local Hardhat.`);

            // Add a one-time click listener to the toast to trigger network switch
            const latestToast = elements.toastContainer.lastElementChild;
            if (latestToast) {
                latestToast.style.cursor = 'pointer';
                latestToast.addEventListener('click', async () => {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x7A69', // 31337
                                chainName: 'Hardhat Local',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['http://127.0.0.1:8545'],
                            }]
                        });
                    } catch (switchError) {
                        console.error('Failed to switch network:', switchError);
                    }
                });
            }

            console.error(`Contract address is null. Network: ${network.name} (Chain: ${network.chainId})`);
        }

    } catch (error) {
        console.error('Connection error:', error);
        showToast('error', 'Connection Failed', error.message);
        elements.connectWallet.disabled = false;
        elements.connectWallet.innerHTML = 'Connect Wallet';
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

async function disconnectWallet() {
    // We can't actually force MetaMask to disconnect, 
    // but we can clear our applications state
    userAddress = null;
    signer = null;
    isOwner = false;
    isSuperAdmin = false;

    // Reset UI
    elements.walletInfo.classList.add('hidden');
    elements.networkBadge.classList.add('hidden');
    elements.connectWallet.classList.remove('hidden');
    elements.connectWallet.disabled = false;
    elements.connectWallet.innerHTML = 'Connect Wallet';

    // Hide admin features
    elements.adminToggle.classList.add('hidden');
    elements.adminPanel.classList.add('hidden');
    elements.roleManagement.classList.add('hidden');

    // Switch to main view
    switchView('main');

    // Clear local storage if we were tracking connection
    localStorage.removeItem('connected');

    showToast('info', 'Disconnected', 'Wallet state cleared from application');
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

// ============ View Switching ============
function switchView(viewName) {
    if (viewName === 'admin') {
        elements.mainView.classList.add('hidden');
        elements.adminView.classList.remove('hidden');
        elements.adminToggle.classList.add('active');
        elements.adminToggle.innerHTML = '<span class="btn-icon">🏠</span> Back Home';
        window.scrollTo(0, 0);
    } else {
        elements.mainView.classList.remove('hidden');
        elements.adminView.classList.add('hidden');
        elements.adminToggle.classList.remove('active');
        elements.adminToggle.innerHTML = 'Go to Admin';
        window.scrollTo(0, 0);
    }
}

// ============ Theme Management ============
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        currentTheme = savedTheme;
    } else if (prefersDark) {
        currentTheme = 'dark';
    } else {
        currentTheme = 'light';
    }

    applyTheme(currentTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);

    // Add a little rotation effect to the button icon
    const svg = elements.themeToggle.querySelector('svg:not([style*="display: none"])');
    if (svg) {
        svg.style.transform = 'rotate(20deg)';
        setTimeout(() => {
            svg.style.transform = '';
        }, 200);
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // document.body is also common, but :root/html is safer for variables
}

// ============ Data Loading ============
async function loadAllData() {
    if (!contract) return;
    try {
        await Promise.all([
            loadCharities(),
            loadStats(),
            loadLeaderboard(),
            loadHistory(),
            loadVersion()
        ]);

        if (isOwner) {
            await loadPendingProposals();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('error', 'Load Error', 'Failed to load blockchain data');
    }
}

async function loadVersion() {
    if (!contract) return;
    try {
        const version = await contract.getVersion();
        if (version && elements.versionBadge) {
            elements.versionBadge.textContent = version;
            elements.versionBadge.classList.remove('hidden');
            console.log(`Contract Version: ${version}`);
        }
    } catch (error) {
        // V1 contracts don't have getVersion, so this is expected to fail
        console.log('Version not available (V1 contract)');
        if (elements.versionBadge) {
            elements.versionBadge.textContent = 'v1.0.0';
            elements.versionBadge.classList.remove('hidden');
        }
    }
}

async function loadCharities() {
    if (!contract) return;
    try {
        // Owner should see all charities (including inactive ones for reactivation)
        // Others only see active ones
        const rawCharities = await (isOwner ? contract.getCharities() : contract.getActiveCharities());

        // Fetch balances for each charity to see what's available for withdrawal
        charities = await Promise.all(rawCharities.map(async (charity) => {
            const balance = await contract.charityBalances(charity.id);
            return {
                ...charity,
                availableBalance: balance
            };
        }));

        renderCharities(charities);
    } catch (error) {
        console.error('Error loading charities:', error);
    }
}

async function loadStats() {
    if (!contract) return;
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
    if (!contract) return;
    try {
        const leaderboard = await contract.getDonorLeaderboard(10);
        renderLeaderboard(leaderboard);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

async function loadHistory() {
    if (!contract) return;
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

    elements.charitiesGrid.innerHTML = charityList.map(charity => {
        const isCharityOwner = userAddress && charity.walletAddress.toLowerCase() === userAddress.toLowerCase();
        const hasBalance = charity.availableBalance && charity.availableBalance.gt(0);

        return `
            <div class="charity-card ${!charity.isActive ? 'deactivated' : ''}" data-id="${charity.id}">
                <div class="charity-header">
                    <div class="charity-icon">${getCharityIcon(charity.name)}</div>
                    <div class="charity-info">
                        <h3 class="charity-name">${escapeHtml(charity.name)}</h3>
                    </div>
                </div>
                <p class="charity-description">${escapeHtml(charity.description)}</p>
                
                ${isCharityOwner ? `
                    <div class="charity-owner-panel">
                        <div class="charity-stat">
                            <span class="charity-stat-label">Available to Withdraw</span>
                            <span class="charity-stat-value success-text">${parseFloat(ethers.utils.formatEther(charity.availableBalance)).toFixed(4)} ETH</span>
                        </div>
                        ${hasBalance ? `
                            <button class="btn btn-success btn-full withdraw-btn" data-id="${charity.id}">
                                <span class="btn-icon">💰</span> Withdraw Funds
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-full" disabled>
                                No Funds Available
                            </button>
                        `}
                    </div>
                ` : ''}

                <p class="charity-wallet">Wallet: ${shortenAddress(charity.walletAddress)}</p>
                
                <div class="charity-actions">
                    ${charity.isActive ? `
                        <button class="btn btn-primary donate-btn" data-id="${charity.id}" data-name="${escapeHtml(charity.name)}">
                            <span class="btn-icon">💝</span> Donate
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-full" disabled>
                            Inactive
                        </button>
                    `}
                    ${isOwner ? `
                        <button class="btn btn-outline ${charity.isActive ? 'btn-danger' : 'btn-success'} toggle-status-btn" data-id="${charity.id}">
                            <span class="btn-icon">${charity.isActive ? '🚫' : '✅'}</span> ${charity.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.donate-btn').forEach(btn => {
        btn.addEventListener('click', () => openDonationModal(btn.dataset.id, btn.dataset.name));
    });

    document.querySelectorAll('.withdraw-btn').forEach(btn => {
        btn.addEventListener('click', () => withdrawFunds(btn.dataset.id));
    });

    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleCharityStatus(btn.dataset.id));
    });
}

async function toggleCharityStatus(charityId) {
    try {
        showToast('info', 'Processing', 'Please confirm the status change in MetaMask...');

        const tx = await contract.toggleCharityStatus(charityId);
        await tx.wait();

        showToast('success', 'Success!', 'Charity status updated successfully!');
        loadAllData();
    } catch (error) {
        console.error('Toggle status error:', error);
        showToast('error', 'Update Failed', error.reason || error.message || 'Transaction failed');
    }
}

async function withdrawFunds(charityId) {
    try {
        showToast('info', 'Processing', 'Please confirm the withdrawal in MetaMask...');

        const tx = await contract.withdrawFunds(charityId);
        await tx.wait();

        showToast('success', 'Success!', 'Funds withdrawn successfully!');
        loadAllData();
    } catch (error) {
        console.error('Withdrawal error:', error);
        showToast('error', 'Withdrawal Failed', error.reason || error.message || 'Transaction failed');
    }
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
    if (!window.ethereum) {
        showMetaMaskInstallPrompt();
        return;
    }

    if (!signer) {
        showToast('warning', 'Wallet Required', 'Please connect your wallet first');
        connectWallet();
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
        elements.confirmDonation.innerHTML = 'Confirm Donation';
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

async function grantAdminRole(e) {
    e.preventDefault();

    if (!signer) {
        showToast('warning', 'Wallet Required', 'Please connect your wallet first');
        return;
    }

    const adminAddress = elements.adminAddress.value.trim();

    if (!ethers.utils.isAddress(adminAddress)) {
        showToast('error', 'Invalid Address', 'Please enter a valid Ethereum address');
        return;
    }

    try {
        const submitBtn = elements.grantRoleForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';

        showToast('info', 'Processing', 'Please confirm the transaction in MetaMask...');

        const tx = await contract.grantRole(ROLES.ADMIN, adminAddress);

        showToast('info', 'Transaction Sent', 'Waiting for confirmation...');

        await tx.wait();

        showToast('success', 'Admin Role Granted! 🔑', `Address ${shortenAddress(adminAddress)} is now an admin`);

        // Reset form
        elements.grantRoleForm.reset();

    } catch (error) {
        console.error('Grant role error:', error);
        showToast('error', 'Grant Role Failed', error.reason || error.message || 'Transaction failed');
    } finally {
        const submitBtn = elements.grantRoleForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">➕</span> Grant Admin Role';
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

// ============ MetaMask Install Prompt ============
function showMetaMaskInstallPrompt() {
    elements.installModal.classList.add('active');
}

function closeInstallModal() {
    elements.installModal.classList.remove('active');
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
