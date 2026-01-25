// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title CharityDonation
 * @dev A smart contract for managing charitable donations on the Ethereum blockchain
 * @notice Implements security best practices: reentrancy guards, access control, checks-effects-interactions
 * @notice Upgradeable version using UUPS pattern and Multi-admin AccessControl
 */
contract CharityDonation is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ Role Definitions ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============ State Variables ============

    // address public owner; // Removed in favor of AccessControl roles

    uint256 public charityCount;
    uint256 public proposalCount;
    uint256 public totalDonations;

    struct Charity {
        uint256 id;
        string name;
        string description;
        address payable walletAddress;
        uint256 totalReceived;
        bool isActive;
    }

    struct CharityProposal {
        uint256 id;
        string name;
        string description;
        address payable walletAddress;
        address proposer;
        bool isProcessed;
        bool isApproved;
    }

    struct Donation {
        address donor;
        uint256 charityId;
        uint256 amount;
        uint256 timestamp;
    }

    struct Donor {
        address donorAddress;
        uint256 totalDonated;
    }

    // Mappings
    mapping(uint256 => Charity) public charities;
    mapping(uint256 => CharityProposal) public proposals;
    mapping(address => uint256) public donorTotalDonations;
    mapping(uint256 => uint256) public charityBalances; // Accumulated funds per charity
    mapping(address => bool) private isDonor;

    // Arrays for iteration
    Donation[] public donationHistory;
    address[] public donorAddresses;

    // ============ Events ============

    event DonationReceived(
        address indexed donor,
        uint256 indexed charityId,
        uint256 amount,
        uint256 timestamp
    );

    event CharityProposed(
        address indexed proposer,
        string name,
        address walletAddress,
        uint256 proposalId
    );

    event CharityApproved(
        uint256 indexed charityId,
        string name,
        address walletAddress
    );

    event CharityRejected(uint256 indexed proposalId, string name);

    event FundsWithdrawn(
        uint256 indexed charityId,
        address indexed recipient,
        uint256 amount
    );

    event CharityStatusChanged(uint256 indexed charityId, bool isActive);

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not an admin"
        );
        _;
    }

    modifier validCharity(uint256 _charityId) {
        require(
            _charityId > 0 && _charityId <= charityCount,
            "Invalid charity ID"
        );
        require(charities[_charityId].isActive, "Charity is not active");
        _;
    }

    // ============ Initializer (replacing Constructor) ============

    /**
     * @notice Replaces constructor for upgradeable contracts
     */
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Initialize with pre-defined charities
        _addCharity(
            "UNICEF",
            "Children's rights and development advocacy",
            payable(0x1890217121689101121181911124618911017811)
        );
    }

    /**
     * @dev Required by UUPSUpgradeable to restrict contract upgrades
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyAdmin {}

    // ============ Internal Functions ============

    function _addCharity(
        string memory _name,
        string memory _description,
        address payable _walletAddress
    ) internal {
        charityCount++;
        charities[charityCount] = Charity({
            id: charityCount,
            name: _name,
            description: _description,
            walletAddress: _walletAddress,
            totalReceived: 0,
            isActive: true
        });
    }

    // ============ Public Functions ============

    /**
     * @notice Donate ETH to a specific charity
     * @param _charityId The ID of the charity to donate to
     */
    function donate(
        uint256 _charityId
    ) external payable validCharity(_charityId) nonReentrant {
        require(msg.value > 0, "Donation amount must be greater than 0");

        // Effects (update state before any external calls - Checks-Effects-Interactions)
        charities[_charityId].totalReceived += msg.value;
        charityBalances[_charityId] += msg.value;
        totalDonations += msg.value;

        // Track donor
        if (!isDonor[msg.sender]) {
            isDonor[msg.sender] = true;
            donorAddresses.push(msg.sender);
        }
        donorTotalDonations[msg.sender] += msg.value;

        // Record donation
        donationHistory.push(
            Donation({
                donor: msg.sender,
                charityId: _charityId,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        // Emit event
        emit DonationReceived(
            msg.sender,
            _charityId,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice Propose a new charity for approval
     * @param _name Name of the charity
     * @param _description Description of the charity
     * @param _walletAddress Wallet address to receive donations
     */
    function proposeCharity(
        string memory _name,
        string memory _description,
        address payable _walletAddress
    ) external {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_walletAddress != address(0), "Invalid wallet address");

        proposalCount++;
        proposals[proposalCount] = CharityProposal({
            id: proposalCount,
            name: _name,
            description: _description,
            walletAddress: _walletAddress,
            proposer: msg.sender,
            isProcessed: false,
            isApproved: false
        });

        emit CharityProposed(msg.sender, _name, _walletAddress, proposalCount);
    }

    /**
     * @notice Approve a pending charity proposal (admin only)
     * @param _proposalId The ID of the proposal to approve
     */
    function approveCharity(uint256 _proposalId) external onlyAdmin {
        require(
            _proposalId > 0 && _proposalId <= proposalCount,
            "Invalid proposal ID"
        );
        require(
            !proposals[_proposalId].isProcessed,
            "Proposal already processed"
        );

        CharityProposal storage proposal = proposals[_proposalId];
        proposal.isProcessed = true;
        proposal.isApproved = true;

        // Add as new charity
        _addCharity(
            proposal.name,
            proposal.description,
            proposal.walletAddress
        );

        emit CharityApproved(
            charityCount,
            proposal.name,
            proposal.walletAddress
        );
    }

    /**
     * @notice Reject a pending charity proposal (admin only)
     * @param _proposalId The ID of the proposal to reject
     */
    function rejectCharity(uint256 _proposalId) external onlyAdmin {
        require(
            _proposalId > 0 && _proposalId <= proposalCount,
            "Invalid proposal ID"
        );
        require(
            !proposals[_proposalId].isProcessed,
            "Proposal already processed"
        );

        CharityProposal storage proposal = proposals[_proposalId];
        proposal.isProcessed = true;
        proposal.isApproved = false;

        emit CharityRejected(_proposalId, proposal.name);
    }

    /**
     * @notice Withdraw accumulated funds for a charity (charity wallet only)
     * @param _charityId The ID of the charity
     */
    function withdrawFunds(uint256 _charityId) external nonReentrant {
        require(
            _charityId > 0 && _charityId <= charityCount,
            "Invalid charity ID"
        );
        Charity storage charity = charities[_charityId];
        require(
            msg.sender == charity.walletAddress,
            "Only charity wallet can withdraw"
        );

        uint256 balance = charityBalances[_charityId];
        require(balance > 0, "No funds to withdraw");

        // Effects before interactions (Checks-Effects-Interactions pattern)
        charityBalances[_charityId] = 0;

        // Interaction
        (bool success, ) = charity.walletAddress.call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_charityId, charity.walletAddress, balance);
    }

    /**
     * @notice Toggle charity active status (admin only)
     * @param _charityId The ID of the charity
     */
    function toggleCharityStatus(uint256 _charityId) external onlyAdmin {
        require(
            _charityId > 0 && _charityId <= charityCount,
            "Invalid charity ID"
        );
        charities[_charityId].isActive = !charities[_charityId].isActive;
        emit CharityStatusChanged(_charityId, charities[_charityId].isActive);
    }

    // ============ View Functions ============

    /**
     * @notice Get all approved charities
     * @return Array of all charity data
     */
    function getCharities() external view returns (Charity[] memory) {
        Charity[] memory allCharities = new Charity[](charityCount);
        for (uint256 i = 1; i <= charityCount; i++) {
            allCharities[i - 1] = charities[i];
        }
        return allCharities;
    }

    /**
     * @notice Get active charities only
     * @return Array of active charity data
     */
    function getActiveCharities() external view returns (Charity[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= charityCount; i++) {
            if (charities[i].isActive) activeCount++;
        }

        Charity[] memory activeCharities = new Charity[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= charityCount; i++) {
            if (charities[i].isActive) {
                activeCharities[index] = charities[i];
                index++;
            }
        }
        return activeCharities;
    }

    /**
     * @notice Get pending charity proposals
     * @return Array of unprocessed proposals
     */
    function getPendingProposals()
        external
        view
        returns (CharityProposal[] memory)
    {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (!proposals[i].isProcessed) pendingCount++;
        }

        CharityProposal[] memory pending = new CharityProposal[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (!proposals[i].isProcessed) {
                pending[index] = proposals[i];
                index++;
            }
        }
        return pending;
    }

    /**
     * @notice Get top donors leaderboard
     * @param _limit Maximum number of donors to return
     * @return Array of top donors sorted by donation amount
     */
    function getDonorLeaderboard(
        uint256 _limit
    ) external view returns (Donor[] memory) {
        uint256 count = donorAddresses.length;
        if (_limit < count) count = _limit;

        // Create array of all donors
        Donor[] memory allDonors = new Donor[](donorAddresses.length);
        for (uint256 i = 0; i < donorAddresses.length; i++) {
            allDonors[i] = Donor({
                donorAddress: donorAddresses[i],
                totalDonated: donorTotalDonations[donorAddresses[i]]
            });
        }

        // Simple bubble sort for top donors (acceptable for small datasets)
        for (uint256 i = 0; i < allDonors.length; i++) {
            for (uint256 j = i + 1; j < allDonors.length; j++) {
                if (allDonors[j].totalDonated > allDonors[i].totalDonated) {
                    Donor memory temp = allDonors[i];
                    allDonors[i] = allDonors[j];
                    allDonors[j] = temp;
                }
            }
        }

        // Return top donors up to limit
        Donor[] memory topDonors = new Donor[](count);
        for (uint256 i = 0; i < count; i++) {
            topDonors[i] = allDonors[i];
        }
        return topDonors;
    }

    /**
     * @notice Get recent donation history
     * @param _limit Maximum number of donations to return
     * @return Array of recent donations
     */
    function getRecentDonations(
        uint256 _limit
    ) external view returns (Donation[] memory) {
        uint256 count = donationHistory.length;
        if (_limit < count) count = _limit;

        Donation[] memory recent = new Donation[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = donationHistory[donationHistory.length - 1 - i];
        }
        return recent;
    }

    /**
     * @notice Get total donations for a specific donor
     * @param _donor Address of the donor
     * @return Total amount donated by the donor
     */
    function getDonorTotal(address _donor) external view returns (uint256) {
        return donorTotalDonations[_donor];
    }

    /**
     * @notice Get contract balance
     * @return Current contract ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Check if address is an admin
     * @param _address Address to check
     * @return True if address has admin role
     */
    function isOwner(address _address) external view returns (bool) {
        return
            hasRole(ADMIN_ROLE, _address) ||
            hasRole(DEFAULT_ADMIN_ROLE, _address);
    }

    // ============ Fallback Functions ============

    receive() external payable {
        revert("Please use the donate function");
    }

    fallback() external payable {
        revert("Function does not exist");
    }
}
