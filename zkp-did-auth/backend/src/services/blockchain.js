const { ethers } = require("ethers");

const DID_AUTH_ABI = [
  "function registerUser(string memory did, uint256 hash) external",
  "function updateUser(string memory did, uint256 newHash) external",
  "function revokeUser(string memory did) external",
  "function verifyUser(string memory did) external view returns (bool)",
  "function isRevoked(string memory did) external view returns (bool)",
  "function getHash(string memory did) external view returns (uint256)",
  "function getUserInfo(string memory did) external view returns (bool registered, bool revoked, uint256 hash, address registrant, uint256 registeredAt, uint256 updatedAt)",
  "event UserRegistered(string indexed did, uint256 hash, address registrant, uint256 timestamp)",
  "event UserUpdated(string indexed did, uint256 newHash, address updatedBy, uint256 timestamp)",
  "event UserRevoked(string indexed did, address revokedBy, uint256 timestamp)",
];

let provider, signer, contract;

function getContract() {
  if (contract) return contract;

  const rpcUrl         = process.env.RPC_URL;
  const privateKey     = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error("Missing blockchain config. Check RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS in .env");
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  signer   = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractAddress, DID_AUTH_ABI, signer);

  console.log(`✅ Blockchain connected — Contract: ${contractAddress}`);
  return contract;
}

// ── Register ──────────────────────────────────────────────────────
async function registerUserOnChain(did, hash) {
  const c = getContract();

  const info = await c.getUserInfo(did).catch(() => null);
  if (info && info.registered) {
    throw new Error(`DID "${did}" is already registered on-chain`);
  }

  console.log(`📤 Registering DID: ${did}`);
  const tx      = await c.registerUser(did, BigInt(hash));
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

// ── Update ────────────────────────────────────────────────────────
async function updateUserOnChain(did, newHash, userPrivateKey) {
  const c = getContract();

  // Use the USER's wallet — only registrant can update
  const userSigner   = new ethers.Wallet(userPrivateKey, provider);
  const userContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    DID_AUTH_ABI,
    userSigner
  );

  const info = await c.getUserInfo(did).catch(() => null);
  if (!info || !info.registered) throw new Error(`DID "${did}" is not registered`);
  if (info.revoked)              throw new Error(`DID "${did}" is revoked and cannot be updated`);

  console.log(`📤 Updating DID: ${did}`);
  const tx      = await userContract.updateUser(did, BigInt(newHash));
  const receipt = await tx.wait();
  console.log(`   ✅ Updated in block: ${receipt.blockNumber}`);

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

// ── Revoke ────────────────────────────────────────────────────────
async function revokeUserOnChain(did, userPrivateKey) {
  const c = getContract();

  // Use the USER's wallet — only registrant can revoke
  const userSigner   = new ethers.Wallet(userPrivateKey, provider);
  const userContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    DID_AUTH_ABI,
    userSigner
  );

  const info = await c.getUserInfo(did).catch(() => null);
  if (!info || !info.registered) throw new Error(`DID "${did}" is not registered`);
  if (info.revoked)              throw new Error(`DID "${did}" is already revoked`);

  console.log(`🔒 Revoking DID: ${did}`);
  const tx      = await userContract.revokeUser(did);
  const receipt = await tx.wait();
  console.log(`   ✅ Revoked in block: ${receipt.blockNumber}`);

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

// ── Read functions ────────────────────────────────────────────────
async function isDIDRegistered(did) {
  const c = getContract();
  return await c.verifyUser(did);
}

async function isDIDRevoked(did) {
  const c = getContract();
  return await c.isRevoked(did);
}

async function getStoredHash(did) {
  const c    = getContract();
  const hash = await c.getHash(did);
  return hash.toString();
}

async function getUserInfo(did) {
  const c = getContract();
  const [registered, revoked, hash, registrant, registeredAt, updatedAt] =
    await c.getUserInfo(did);
  return {
    registered,
    revoked,
    hash: hash.toString(),
    registrant,
    registeredAt: registeredAt.toString(),
    updatedAt: updatedAt.toString(),
  };
}

module.exports = {
  registerUserOnChain,
  updateUserOnChain,
  revokeUserOnChain,
  isDIDRegistered,
  isDIDRevoked,
  getStoredHash,
  getUserInfo,
};
