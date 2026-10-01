/**
 * generate_proof.js
 * ─────────────────────────────────────────────────────────────────
 * Demonstrates proof generation using SnarkJS (Node.js)
 * This is the same logic used inside the React frontend (browser).
 *
 * Usage:
 *   node scripts/generate_proof.js <secret>
 *   node scripts/generate_proof.js 12345678
 * ─────────────────────────────────────────────────────────────────
 */

const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const path = require("path");
const fs = require("fs");

async function main() {
  const secret = process.argv[2] || "12345678";

  console.log("\n════════════════════════════════════════════════");
  console.log("  ZKP Proof Generation Demo");
  console.log("════════════════════════════════════════════════\n");

  // ── Step 1: Compute Poseidon hash of secret ──────────────────
  console.log(`🔒 Secret (private):  "${secret}"`);

  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // Convert secret string to BigInt field element
  const secretBigInt = BigInt(
    "0x" + Buffer.from(secret, "utf8").toString("hex")
  );

  const hashResult = poseidon([secretBigInt]);
  const hash = F.toObject(hashResult).toString();

  console.log(`📌 Poseidon Hash (public): ${hash}`);

  // ── Step 2: Prepare circuit inputs ───────────────────────────
  const input = {
    secret: secretBigInt.toString(),
    hash: hash,
  };

  console.log("\n📋 Circuit inputs:");
  console.log(JSON.stringify(input, null, 2));

  // ── Step 3: Generate witness & proof ─────────────────────────
  const wasmPath = path.join(__dirname, "../build/auth_js/auth.wasm");
  const zkeyPath = path.join(__dirname, "../build/auth_0001.zkey");

  if (!fs.existsSync(wasmPath)) {
    console.error("\n❌ WASM file not found. Run 'npm run setup' first.");
    process.exit(1);
  }

  console.log("\n⚡ Generating ZK proof...");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasmPath,
    zkeyPath
  );

  console.log("\n✅ Proof generated successfully!");
  console.log("\n📄 Proof (to send to backend):");
  console.log(JSON.stringify(proof, null, 2));

  console.log("\n📌 Public Signals (hash):");
  console.log(JSON.stringify(publicSignals, null, 2));

  // ── Step 4: Verify the proof ─────────────────────────────────
  const vkeyPath = path.join(__dirname, "../build/verification_key.json");
  const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf8"));

  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  console.log(`\n🔐 Proof verification: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

  // Save outputs
  fs.writeFileSync("build/proof.json", JSON.stringify(proof, null, 2));
  fs.writeFileSync(
    "build/public.json",
    JSON.stringify(publicSignals, null, 2)
  );
  console.log("\n💾 Proof saved to build/proof.json");
  console.log("💾 Public signals saved to build/public.json");

  console.log("\n════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
