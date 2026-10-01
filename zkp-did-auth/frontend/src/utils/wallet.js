import { ethers } from "ethers";

// ── Contract ABI (minimal — only what we use) ─────────────────────
export const DID_AUTH_ABI = [
  "function registerUser(string memory did, uint256 hash) external",
  "function verifyUser(string memory did) external view returns (bool)",
  "function getHash(string memory did) external view returns (uint256)",
  "function getUserInfo(string memory did) external view returns (bool registered, uint256 hash)",
];

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

/**
 * Connect MetaMask and return { provider, signer, address }
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask not found. Please install MetaMask (https://metamask.io) and refresh."
    );
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}

/**
 * Get a contract instance (read-only or writable)
 */
export function getContract(signer) {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "Contract address not configured. Set REACT_APP_CONTRACT_ADDRESS in .env"
    );
  }
  return new ethers.Contract(CONTRACT_ADDRESS, DID_AUTH_ABI, signer);
}

/**
 * Check if MetaMask is available
 */
export function isMetaMaskAvailable() {
  return typeof window.ethereum !== "undefined";
}

/**
 * Get current connected account (without prompting)
 */
export async function getCurrentAccount() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || null;
}

/**
 * Listen for account changes
 */
export function onAccountChange(callback) {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", callback);
}

/**
 * Listen for network changes
 */
export function onChainChange(callback) {
  if (!window.ethereum) return;
  window.ethereum.on("chainChanged", callback);
}
