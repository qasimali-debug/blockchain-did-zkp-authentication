#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  ZKP Circuit Setup Script
#  Compiles circuit, runs trusted setup, generates proving keys
# ─────────────────────────────────────────────────────────────────
set -e

echo ""
echo "════════════════════════════════════════════════"
echo "  ZKP Circuit Setup — Groth16 + Poseidon"
echo "════════════════════════════════════════════════"
echo ""

# Install npm deps (circomlib)
echo "📦 Installing circomlib..."
npm install

# Create output directory
mkdir -p build

# ── Step 1: Compile Circuit ──────────────────────────────────────
echo ""
echo "⚙️  Step 1: Compiling auth.circom..."
circom auth.circom --r1cs --wasm --sym -o build/
echo "✅ Circuit compiled → build/auth.r1cs"

# ── Step 2: Powers of Tau (Phase 1) ─────────────────────────────
echo ""
echo "🔐 Step 2: Powers of Tau ceremony (Phase 1)..."

if [ ! -f "pot12_final.ptau" ]; then
  snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
  snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
    --name="First contribution" -v -e="$(openssl rand -hex 32)"
  snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
  echo "✅ Powers of Tau complete → pot12_final.ptau"
else
  echo "⏭️  pot12_final.ptau already exists, skipping..."
fi

# ── Step 3: Phase 2 (Circuit-specific) ──────────────────────────
echo ""
echo "🔑 Step 3: Phase 2 setup (circuit-specific)..."
snarkjs groth16 setup build/auth.r1cs pot12_final.ptau build/auth_0000.zkey
snarkjs zkey contribute build/auth_0000.zkey build/auth_0001.zkey \
  --name="Auth Contributor" -v -e="$(openssl rand -hex 32)"
echo "✅ Proving key generated → build/auth_0001.zkey"

# ── Step 4: Export Verification Key ─────────────────────────────
echo ""
echo "📄 Step 4: Exporting verification key..."
snarkjs zkey export verificationkey build/auth_0001.zkey build/verification_key.json
echo "✅ Verification key → build/verification_key.json"

# ── Step 5: Export Solidity Verifier ────────────────────────────
echo ""
echo "📜 Step 5: Exporting Solidity verifier contract..."
snarkjs zkey export solidityverifier build/auth_0001.zkey \
  ../contracts/contracts/Verifier.sol
echo "✅ Verifier.sol → contracts/contracts/Verifier.sol"

echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "Files generated:"
echo "  build/auth.r1cs              → R1CS constraint system"
echo "  build/auth_js/               → WASM witness generator"
echo "  build/auth_0001.zkey         → Proving key"
echo "  build/verification_key.json  → Verification key"
echo ""
echo "Next: Run 'npm run prove' to generate a test proof"
echo ""
