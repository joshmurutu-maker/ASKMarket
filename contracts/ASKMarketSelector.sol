// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Registry for the ASKMarket selector supplied by the project owner.
/// @dev This is metadata only. It is NOT a deployed marketplace, wallet, escrow,
///      token, payment rail, or transfer contract. Verify the selector against
///      the canonical signature with Keccak-256 before implementing dispatch.
library ASKMarketSelector {
    bytes4 internal constant ASKMARKET_SELECTOR = 0xa397fc12;
    uint256 internal constant TEST_CHAIN_ID = 11155111; // Sepolia
    bool internal constant PRODUCTION_TRANSFERS_ENABLED = false;
}
