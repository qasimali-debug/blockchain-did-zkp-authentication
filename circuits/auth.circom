pragma circom 2.0.0;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  ZKP Authentication Circuit — Replay-Attack Resistant
 *  Project: Blockchain-based Privacy-Preserving Authentication (DID + ZKP)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  WHAT THIS PROVES:
 *    "I know a secret such that:
 *      1. Poseidon(secret) == hash        (identity check)
 *      2. Poseidon(secret, nonce) == nonceHash  (unique per-session proof)
 *    — WITHOUT revealing the secret itself."
 *
 *  REPLAY ATTACK FIX:
 *    The OLD circuit had no randomness — every login produced the SAME proof
 *    for the same secret. An attacker who captured a proof could reuse it.
 *
 *    The FIX adds a `nonce` (random number generated fresh each login):
 *      - `nonce` is a PRIVATE input (never revealed)
 *      - `nonceHash` = Poseidon(secret, nonce) is PUBLIC
 *      - Backend stores used nonceHashes and rejects duplicates
 *      - Every login produces a DIFFERENT proof, even for the same secret
 *
 *  INPUTS:
 *    Private:  secret    — user's password (never revealed)
 *    Private:  nonce     — random per-session value (never revealed)
 *    Public:   hash      — Poseidon(secret), stored on-chain at registration
 *    Public:   nonceHash — Poseidon(secret, nonce), checked for uniqueness
 *
 *  CONSTRAINTS:
 *    hash      === Poseidon(secret)         ← proves identity
 *    nonceHash === Poseidon(secret, nonce)  ← makes proof unique per session
 *
 *  PROVING SCHEME: Groth16
 *  HASH FUNCTION:  Poseidon (ZK-friendly)
 * ─────────────────────────────────────────────────────────────────────────────
 */

include "../node_modules/circomlib/circuits/poseidon.circom";

template AuthProof() {
    // ── Private Inputs (never revealed in proof) ──────────────────────────────
    signal input secret;   // user's password
    signal input nonce;    // random value generated fresh each login session

    // ── Public Inputs (visible to verifier) ───────────────────────────────────
    signal input hash;       // Poseidon(secret) — stored on blockchain
    signal input nonceHash;  // Poseidon(secret, nonce) — unique per login

    // ── Constraint 1: Prove knowledge of secret ───────────────────────────────
    // Poseidon with 1 input: proves Poseidon(secret) == hash
    component poseidon1 = Poseidon(1);
    poseidon1.inputs[0] <== secret;
    hash === poseidon1.out;

    // ── Constraint 2: Bind nonce to secret (anti-replay) ─────────────────────
    // Poseidon with 2 inputs: proves Poseidon(secret, nonce) == nonceHash
    // This makes every proof unique — attacker cannot reuse a captured proof
    component poseidon2 = Poseidon(2);
    poseidon2.inputs[0] <== secret;
    poseidon2.inputs[1] <== nonce;
    nonceHash === poseidon2.out;
}

// nonceHash and hash are public; secret and nonce are private
component main {public [hash, nonceHash]} = AuthProof();
