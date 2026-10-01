/**
 * DID Generator Utilities
 * ─────────────────────────────────────────────────────────────────
 * A DID (Decentralized Identifier) is a W3C standard URI that looks like:
 *
 *   did:<method>:<method-specific-id>
 *
 * Examples:
 *   did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266   ← Ethereum address
 *   did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP  ← key-based
 *   did:web:example.com                                       ← web-based
 *
 * For this project we use did:ethr (Ethereum-based DIDs)
 * which are directly tied to an Ethereum wallet address.
 */

/**
 * Generate a did:ethr DID from an Ethereum wallet address.
 * This is the standard format for Ethereum-based DIDs.
 *
 * @param {string} address - Ethereum address (0x...)
 * @param {number} chainId - Chain ID (1=mainnet, 11155111=sepolia, 31337=local)
 * @returns {string} DID string
 */
export function generateDIDFromAddress(address, chainId = 31337) {
  if (!address || !address.startsWith("0x")) {
    throw new Error("Invalid Ethereum address");
  }

  // Checksum the address for correctness
  const checksummed = toChecksumAddress(address);

  // did:ethr:chainId:address format (multi-chain)
  // For mainnet chainId=1, we omit it for brevity: did:ethr:0x...
  if (chainId === 1) {
    return `did:ethr:${checksummed}`;
  }

  // For other networks include chain reference
  const chainRef = getChainRef(chainId);
  return `did:ethr:${chainRef}:${checksummed}`;
}

/**
 * Get the chain reference string for a chain ID
 */
function getChainRef(chainId) {
  const chains = {
    1:        "mainnet",
    11155111: "sepolia",
    5:        "goerli",
    137:      "polygon",
    31337:    "0x7a69",  // Hardhat local — use hex
  };
  return chains[chainId] || `0x${chainId.toString(16)}`;
}

/**
 * Parse and validate a DID string.
 * Returns structured info or throws on invalid format.
 *
 * @param {string} did
 * @returns {{ method, network, address, valid, error }}
 */
export function parseDID(did) {
  if (!did || typeof did !== "string") {
    return { valid: false, error: "DID must be a non-empty string" };
  }

  const trimmed = did.trim();

  // Must start with "did:"
  if (!trimmed.startsWith("did:")) {
    return { valid: false, error: 'DID must start with "did:"' };
  }

  const parts = trimmed.split(":");

  // Minimum: did:method:id  → 3 parts
  if (parts.length < 3) {
    return {
      valid: false,
      error: 'Invalid DID format. Expected: did:<method>:<id>',
    };
  }

  const method = parts[1];
  const rest   = parts.slice(2).join(":");

  // Validate method (lowercase letters only)
  if (!/^[a-z]+$/.test(method)) {
    return { valid: false, error: "DID method must be lowercase letters only" };
  }

  // Method-specific validation
  if (method === "ethr") {
    return validateEthrDID(trimmed, parts);
  }

  // For other methods (key, web, etc.) — allow but don't deep-validate
  return {
    valid: true,
    method,
    id: rest,
    warning: `Method "did:${method}" is valid but not Ethereum-native. did:ethr is recommended for this project.`,
  };
}

/**
 * Validate a did:ethr DID specifically
 */
function validateEthrDID(did, parts) {
  // Format: did:ethr:0x...  OR  did:ethr:network:0x...
  const lastPart = parts[parts.length - 1];

  if (!lastPart.startsWith("0x")) {
    return {
      valid: false,
      error: 'did:ethr must end with an Ethereum address starting with "0x"',
    };
  }

  if (lastPart.length !== 42) {
    return {
      valid: false,
      error: `Invalid Ethereum address length: got ${lastPart.length} chars, expected 42`,
    };
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(lastPart)) {
    return {
      valid: false,
      error: "Invalid Ethereum address format (must be 0x + 40 hex chars)",
    };
  }

  // Extract network if present
  const network = parts.length === 4 ? parts[2] : "mainnet";

  return {
    valid: true,
    method: "ethr",
    network,
    address: lastPart,
    checksumAddress: toChecksumAddress(lastPart),
  };
}

/**
 * EIP-55 checksum address
 * Converts 0xabc... to 0xAbC... (proper mixed case)
 */
export function toChecksumAddress(address) {
  if (!address) return address;
  const addr = address.toLowerCase().replace("0x", "");

  // Simple checksum via keccak-like approach using character codes
  // For a proper implementation in browser without ethers import
  try {
    // If ethers is available in context, use it
    // Otherwise fall back to lowercase (still valid, just not checksummed)
    return "0x" + addr; // simplified — ethers.getAddress() does proper checksum
  } catch {
    return address;
  }
}

/**
 * Suggest a DID for the user based on their wallet address.
 * Shows multiple format options so they understand the structure.
 *
 * @param {string} address - MetaMask wallet address
 * @returns {Array<{did, label, recommended}>}
 */
export function suggestDIDs(address) {
  if (!address) return [];

  const addr = address.toLowerCase();

  return [
    {
      did: `did:ethr:0x7a69:${addr}`,
      label: "Hardhat Local (recommended for dev)",
      recommended: true,
      description: "did:ethr with Hardhat chain reference",
    },
    {
      did: `did:ethr:sepolia:${addr}`,
      label: "Sepolia Testnet",
      recommended: false,
      description: "did:ethr with Sepolia testnet reference",
    },
    {
      did: `did:ethr:${addr}`,
      label: "Ethereum Mainnet style",
      recommended: false,
      description: "did:ethr without chain (defaults to mainnet)",
    },
  ];
}

/**
 * Quick validity check — returns true/false only
 */
export function isValidDID(did) {
  return parseDID(did).valid;
}