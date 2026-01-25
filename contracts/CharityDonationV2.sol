// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./CharityDonation.sol";

/**
 * @title CharityDonationV2
 * @dev Version 2 of the CharityDonation contract
 * @notice Adds version tracking functionality to demonstrate UUPS upgrade
 */
contract CharityDonationV2 is CharityDonation {
    // ============ V2 State Variables ============
    // IMPORTANT: New variables must be added at the END to preserve storage layout
    string public contractVersion;

    // ============ V2 Events ============
    event VersionUpdated(string oldVersion, string newVersion);

    // ============ V2 Functions ============

    /**
     * @notice Returns the hardcoded version of this contract implementation
     * @return The version string "v2.0.0"
     */
    function getVersion() public pure returns (string memory) {
        return "v2.0.0";
    }

    /**
     * @notice Allows an admin to set a custom version string
     * @param _version The new version string to set
     */
    function setVersion(string memory _version) public onlyAdmin {
        string memory oldVersion = contractVersion;
        contractVersion = _version;
        emit VersionUpdated(oldVersion, _version);
    }
}
