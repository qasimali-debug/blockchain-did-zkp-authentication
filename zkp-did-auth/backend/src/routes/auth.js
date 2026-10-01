const express = require("express");
const router  = express.Router();

const {
  registerUserOnChain,
  updateUserOnChain,
  revokeUserOnChain,
  isDIDRegistered,
  isDIDRevoked,
  getStoredHash,
  getUserInfo,
} = require("../services/blockchain");

const { verifyZKProof, extractHashFromSignals } = require("../services/zkp");

// ── Anti-replay nonce store ───────────────────────────────────────
const usedNonces      = new Set();
const nonceTimestamps = new Map();
const NONCE_TTL_MS    = 60 * 60 * 1000; // 1 hour

function isNonceUsed(nonceHash)  { return usedNonces.has(nonceHash); }
function markNonceUsed(nonceHash) {
  usedNonces.add(nonceHash);
  nonceTimestamps.set(nonceHash, Date.now());
}
setInterval(() => {
  const now = Date.now();
  for (const [nonce, ts] of nonceTimestamps.entries()) {
    if (now - ts > NONCE_TTL_MS) {
      usedNonces.delete(nonce);
      nonceTimestamps.delete(nonce);
    }
  }
}, 15 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────
//  POST /api/register
// ─────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { did, hash } = req.body;

    if (!did || typeof did !== "string" || did.trim().length === 0)
      return res.status(400).json({ error: "DID is required and must be a non-empty string" });
    if (!hash || typeof hash !== "string")
      return res.status(400).json({ error: "Hash is required and must be a decimal string" });

    try { BigInt(hash); } catch {
      return res.status(400).json({ error: "Hash must be a valid decimal number string" });
    }

    console.log(`\n📥 [POST /register] DID: ${did}`);
    const result = await registerUserOnChain(did.trim(), hash);

    return res.status(201).json({
      success: true,
      message: "User registered successfully on blockchain",
      did: did.trim(),
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    if (err.message.includes("already registered"))
      return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: "Registration failed", details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/verify
// ─────────────────────────────────────────────────────────────────
router.post("/verify", async (req, res) => {
  try {
    const { did, proof, publicSignals } = req.body;

    if (!did || typeof did !== "string")
      return res.status(400).json({ error: "DID is required" });
    if (!proof || typeof proof !== "object")
      return res.status(400).json({ error: "Proof object is required" });
    if (!publicSignals || !Array.isArray(publicSignals) || publicSignals.length < 2)
      return res.status(400).json({ error: "publicSignals must be [hash, nonceHash]" });

    const proofHash      = publicSignals[0].toString();
    const proofNonceHash = publicSignals[1].toString();

    console.log(`\n📥 [POST /verify] DID: ${did}`);

    // Step 1: Replay check
    if (isNonceUsed(proofNonceHash)) {
      console.log("   ❌ REPLAY ATTACK DETECTED");
      return res.status(401).json({
        success: false, authenticated: false,
        error: "Replay attack detected: proof already used. Please generate a new proof.",
      });
    }

    // Step 2: DID registered?
    const info = await getUserInfo(did.trim());
    if (!info.registered)
      return res.status(404).json({ success: false, authenticated: false, error: `DID "${did}" not found on blockchain.` });

    // Step 3: DID revoked?
    if (info.revoked) {
      console.log("   ❌ DID IS REVOKED");
      return res.status(401).json({
        success: false, authenticated: false,
        error: `DID "${did}" has been revoked. Authentication is permanently disabled for this identity.`,
      });
    }

    // Step 4: ZKP verification
    const proofValid = await verifyZKProof(proof, publicSignals);
    if (!proofValid) {
      console.log("   ❌ ZK proof INVALID");
      return res.status(401).json({ success: false, authenticated: false, error: "ZK proof verification failed." });
    }
    console.log("   ✅ ZK proof VALID");

    // Step 5: Hash cross-check
    const storedHash = await getStoredHash(did.trim());
    if (proofHash !== storedHash) {
      console.log("   ❌ Hash mismatch");
      return res.status(401).json({ success: false, authenticated: false, error: "Hash mismatch: wrong secret." });
    }
    console.log("   ✅ Hash matches on-chain record");

    // Step 6: Consume nonce
    markNonceUsed(proofNonceHash);
    console.log("   🔐 Authentication SUCCESSFUL");

    return res.status(200).json({
      success: true, authenticated: true,
      message: "Authentication successful! ZK proof verified.",
      did: did.trim(),
      replayProtected: true,
    });
  } catch (err) {
    console.error("Verification error:", err.message);
    return res.status(500).json({ error: "Verification failed", details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/update
//  Update hashed secret — only original registrant wallet
// ─────────────────────────────────────────────────────────────────
router.post("/update", async (req, res) => {
  try {
    const { did, newHash, privateKey } = req.body;

    if (!did || typeof did !== "string" || did.trim().length === 0)
      return res.status(400).json({ error: "DID is required" });
    if (!newHash || typeof newHash !== "string")
      return res.status(400).json({ error: "newHash is required as decimal string" });
    if (!privateKey || typeof privateKey !== "string")
      return res.status(400).json({ error: "privateKey is required to prove ownership" });

    try { BigInt(newHash); } catch {
      return res.status(400).json({ error: "newHash must be a valid decimal number string" });
    }

    console.log(`\n📥 [POST /update] DID: ${did}`);
    const result = await updateUserOnChain(did.trim(), newHash, privateKey);

    return res.status(200).json({
      success: true,
      message: "DID secret updated successfully on blockchain",
      did: did.trim(),
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
    });
  } catch (err) {
    console.error("Update error:", err.message);
    if (err.message.includes("not the registrant"))
      return res.status(403).json({ error: "Unauthorized: only the original registrant wallet can update this DID" });
    if (err.message.includes("revoked"))
      return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: "Update failed", details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/revoke
//  Permanently revoke a DID — only original registrant wallet
// ─────────────────────────────────────────────────────────────────
router.post("/revoke", async (req, res) => {
  try {
    const { did, privateKey } = req.body;

    if (!did || typeof did !== "string" || did.trim().length === 0)
      return res.status(400).json({ error: "DID is required" });
    if (!privateKey || typeof privateKey !== "string")
      return res.status(400).json({ error: "privateKey is required to prove ownership" });

    console.log(`\n📥 [POST /revoke] DID: ${did}`);
    const result = await revokeUserOnChain(did.trim(), privateKey);

    return res.status(200).json({
      success: true,
      message: "DID revoked successfully. This identity is permanently disabled.",
      did: did.trim(),
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
    });
  } catch (err) {
    console.error("Revoke error:", err.message);
    if (err.message.includes("not the registrant"))
      return res.status(403).json({ error: "Unauthorized: only the original registrant wallet can revoke this DID" });
    if (err.message.includes("already revoked"))
      return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: "Revocation failed", details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/status/:did
// ─────────────────────────────────────────────────────────────────
router.get("/status/:did", async (req, res) => {
  try {
    const { did } = req.params;
    const info    = await getUserInfo(decodeURIComponent(did));
    return res.json({
      did: decodeURIComponent(did),
      registered: info.registered,
      revoked: info.revoked,
      registrant: info.registrant,
      registeredAt: info.registeredAt,
      updatedAt: info.updatedAt,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
