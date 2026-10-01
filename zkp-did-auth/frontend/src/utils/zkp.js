import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";

let poseidonInstance = null;

/**
 * Get (or initialize) the Poseidon hash function — cached after first call
 */
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Convert a UTF-8 string to a field-safe BigInt
 * Keeps value within the BN128 scalar field (< 2^254)
 */
function stringToBigInt(str) {
  const bytes = new TextEncoder().encode(str);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // eslint-disable-next-line no-undef
  return BigInt("0x" + hex);
}

/**
 * Generate a cryptographically random nonce as a BigInt.
 * Uses window.crypto for true randomness — different every call.
 * This is the core of the anti-replay defense.
 */
function generateNonce() {
  const array = new Uint8Array(31); // 248 bits — safely within BN128 field
  window.crypto.getRandomValues(array);
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // eslint-disable-next-line no-undef
  return BigInt("0x" + hex);
}

/**
 * Compute Poseidon(secret) — the hash stored on-chain at registration.
 * @param {string} secret
 * @returns {{ hash: string, secretBigInt: string }}
 */
export async function computePoseidonHash(secret) {
  const poseidon = await getPoseidon();
  const F = poseidon.F;

  const secretBigInt = stringToBigInt(secret);
  const result = poseidon([secretBigInt]);
  const hash = F.toObject(result).toString();

  return { hash, secretBigInt: secretBigInt.toString() };
}

/**
 * Compute Poseidon(secret, nonce) — the per-session nonce hash.
 * Used to make each proof unique (anti-replay).
 * @param {BigInt} secretBigInt
 * @param {BigInt} nonce
 * @returns {string} nonceHash as decimal string
 */
async function computeNonceHash(secretBigInt, nonce) {
  const poseidon = await getPoseidon();
  const F = poseidon.F;
  const result = poseidon([secretBigInt, nonce]);
  return F.toObject(result).toString();
}

/**
 * Generate a Groth16 ZK-SNARK proof with anti-replay nonce.
 *
 * Circuit proves TWO things simultaneously:
 *   1. Poseidon(secret)        == hash       → proves identity
 *   2. Poseidon(secret, nonce) == nonceHash  → makes proof unique per session
 *
 * The nonce is random and private — it never leaves the browser.
 * The nonceHash is public and sent to the backend, which rejects duplicates.
 *
 * @param {string} secret  - User's plaintext secret
 * @param {string} hash    - Poseidon(secret) — the on-chain registered hash
 * @returns {{ proof, publicSignals, nonce, nonceHash }}
 */
export async function generateZKProof(secret, hash) {
  const { secretBigInt } = await computePoseidonHash(secret);

  // ── Generate fresh random nonce (anti-replay) ──────────────────
  // This makes every proof cryptographically unique — even for the same secret
  const nonce = generateNonce();
  const nonceHash = await computeNonceHash(BigInt(secretBigInt), nonce);

  // ── Circuit inputs ──────────────────────────────────────────────
  const input = {
    secret: secretBigInt,          // private
    nonce: nonce.toString(),       // private
    hash: hash,                    // public — must match on-chain
    nonceHash: nonceHash,          // public — backend checks for replay
  };

  const wasmPath = "/circuits/auth_js/auth.wasm";
  const zkeyPath = "/circuits/auth_0001.zkey";

  console.log("Generating ZK proof with nonce (anti-replay)...");
  console.log("  nonce    :", nonce.toString().slice(0, 16) + "...");
  console.log("  nonceHash:", nonceHash.slice(0, 16) + "...");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasmPath,
    zkeyPath
  );

  // publicSignals = [hash, nonceHash]  (order matches circuit public declaration)
  return { proof, publicSignals, nonceHash };
}

/**
 * Optional: verify proof locally in the browser before sending to backend
 */
export async function verifyProofLocally(proof, publicSignals) {
  const response = await fetch("/circuits/verification_key.json");
  const vkey = await response.json();
  return snarkjs.groth16.verify(vkey, publicSignals, proof);
}
