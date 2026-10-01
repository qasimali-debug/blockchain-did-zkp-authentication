// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DIDAuth
 * @notice Blockchain-based Privacy-Preserving Authentication using DID
 * @dev Stores user DIDs and their associated hashed secrets (Poseidon hashes).
 *      Supports full DID lifecycle: Register, Verify, Update, Revoke.
 *      Only the original registrant wallet can update or revoke their DID.
 */
contract DIDAuth {

    // ─────────────────────────────────────────────
    //  Structs
    // ─────────────────────────────────────────────

    struct DIDRecord {
        uint256 hash;           // Poseidon(secret) — updated on secret change
        address registrant;     // wallet that registered — only this can update/revoke
        uint256 registeredAt;   // block timestamp of registration
        uint256 updatedAt;      // block timestamp of last update (0 if never updated)
        bool isRegistered;      // true if registered
        bool isRevoked;         // true if revoked — cannot login after revocation
    }

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    /// @dev Maps DID string → full DID record
    mapping(string => DIDRecord) private records;

    /// @dev Owner of the contract (deployer)
    address public owner;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event UserRegistered(string indexed did, uint256 hash, address registrant, uint256 timestamp);
    event UserUpdated(string indexed did, uint256 newHash, address updatedBy, uint256 timestamp);
    event UserRevoked(string indexed did, address revokedBy, uint256 timestamp);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    /// @dev Only the original registrant wallet can call this function
    modifier onlyRegistrant(string memory did) {
        require(records[did].isRegistered, "DIDAuth: DID not registered");
        require(!records[did].isRevoked, "DIDAuth: DID is revoked");
        require(records[did].registrant == msg.sender, "DIDAuth: Caller is not the registrant");
        _;
    }

    // ─────────────────────────────────────────────
    //  Core Functions
    // ─────────────────────────────────────────────

    /**
     * @notice Register a new user with their DID and hashed secret
     * @param did   Decentralized Identifier string (e.g. "did:ethr:0x...")
     * @param hash  Poseidon hash of the user's secret (uint256)
     */
    function registerUser(string memory did, uint256 hash) external {
        require(bytes(did).length > 0, "DIDAuth: DID cannot be empty");
        require(hash != 0, "DIDAuth: Hash cannot be zero");
        require(!records[did].isRegistered, "DIDAuth: DID already registered");

        records[did] = DIDRecord({
            hash: hash,
            registrant: msg.sender,
            registeredAt: block.timestamp,
            updatedAt: 0,
            isRegistered: true,
            isRevoked: false
        });

        emit UserRegistered(did, hash, msg.sender, block.timestamp);
    }

    /**
     * @notice Update the hashed secret for an existing DID
     * @dev Only callable by the original registrant wallet
     * @param did      Decentralized Identifier string
     * @param newHash  New Poseidon hash of the updated secret
     */
    function updateUser(string memory did, uint256 newHash) external onlyRegistrant(did) {
        require(newHash != 0, "DIDAuth: New hash cannot be zero");
        require(newHash != records[did].hash, "DIDAuth: New hash must differ from current hash");

        records[did].hash = newHash;
        records[did].updatedAt = block.timestamp;

        emit UserUpdated(did, newHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke a DID permanently — prevents all future logins
     * @dev Only callable by the original registrant wallet. Irreversible.
     * @param did  Decentralized Identifier string to revoke
     */
    function revokeUser(string memory did) external onlyRegistrant(did) {
        records[did].isRevoked = true;

        emit UserRevoked(did, msg.sender, block.timestamp);
    }

    /**
     * @notice Check whether a DID is registered and not revoked
     * @param did  Decentralized Identifier string
     * @return     true if registered and active, false otherwise
     */
    function verifyUser(string memory did) external view returns (bool) {
        return records[did].isRegistered && !records[did].isRevoked;
    }

    /**
     * @notice Check whether a DID has been revoked
     * @param did  Decentralized Identifier string
     * @return     true if revoked
     */
    function isRevoked(string memory did) external view returns (bool) {
        return records[did].isRevoked;
    }

    /**
     * @notice Get the stored hash for an active DID
     * @param did  Decentralized Identifier string
     * @return     The current Poseidon hash
     */
    function getHash(string memory did) external view returns (uint256) {
        require(records[did].isRegistered, "DIDAuth: DID not registered");
        require(!records[did].isRevoked, "DIDAuth: DID is revoked");
        return records[did].hash;
    }

    /**
     * @notice Get full record for a DID
     * @param did  Decentralized Identifier string
     */
    function getUserInfo(string memory did)
        external
        view
        returns (
            bool registered,
            bool revoked,
            uint256 hash,
            address registrant,
            uint256 registeredAt,
            uint256 updatedAt
        )
    {
        DIDRecord memory r = records[did];
        return (
            r.isRegistered,
            r.isRevoked,
            r.hash,
            r.registrant,
            r.registeredAt,
            r.updatedAt
        );
    }
}
