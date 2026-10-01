# Blockchain-based Privacy-Preserving Authentication
## Using DID and Zero-Knowledge Proofs (ZKP)

> Final Year University Project — Ethereum + Circom + SnarkJS + React + Node.js

---

## 📁 Folder Structure

```
zkp-did-auth/
├── contracts/          # Solidity smart contracts + Hardhat config
├── circuits/           # Circom ZKP circuit + proving keys
├── backend/            # Node.js + Express API
├── frontend/           # React.js frontend
└── README.md
```

---

## 🔧 Prerequisites

Install these globally before starting:

```bash
# Node.js v18+
node --version

# Hardhat (for smart contracts)
npm install -g hardhat

# Circom 2.x (for ZKP circuits)
# On Linux/Mac:
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
cargo install circom

# Or download binary from: https://github.com/iden3/circom/releases

# SnarkJS
npm install -g snarkjs
```

---

## 🚀 Quick Start (Local Development)

### Step 1 — Install All Dependencies

```bash
# Root
cd zkp-did-auth

# Contracts
cd contracts && npm install && cd ..

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

---

### Step 2 — Compile & Deploy Smart Contract (Local)

```bash
cd contracts

# Start local Hardhat node (keep this terminal open)
npx hardhat node

# In a NEW terminal — deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address from the output. You'll need it for the backend `.env`.

---

### Step 3 — Compile ZKP Circuit & Generate Keys

```bash
cd circuits

# Compile the circuit
circom auth.circom --r1cs --wasm --sym -o build/

# Powers of Tau ceremony (Phase 1) — use existing ptau file
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random entropy"
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Phase 2 (circuit-specific setup)
snarkjs groth16 setup build/auth.r1cs pot12_final.ptau build/auth_0000.zkey
snarkjs zkey contribute build/auth_0000.zkey build/auth_0001.zkey --name="1st Contributor" -v -e="more entropy"
snarkjs zkey export verificationkey build/auth_0001.zkey build/verification_key.json

# Export Solidity verifier (optional - for on-chain verification)
snarkjs zkey export solidityverifier build/auth_0001.zkey ../contracts/contracts/Verifier.sol
```

---

### Step 4 — Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
CONTRACT_ADDRESS=<address from Step 2>
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=<private key from Hardhat local accounts>
```

Start the backend:
```bash
npm run dev
```

---

### Step 5 — Configure & Start Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_CONTRACT_ADDRESS=<address from Step 2>
```

Start the frontend:
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔐 Authentication Flow

```
REGISTER:
  User enters DID + Secret
       ↓
  Frontend: hash = Poseidon(secret)
       ↓
  MetaMask signs & calls registerUser(did, hash)
       ↓
  Smart contract stores (did → hash) on blockchain

LOGIN:
  User enters DID + Secret
       ↓
  Frontend: generate ZKP proof (secret → knows preimage of hash)
       ↓
  POST /verify → Backend receives proof + public signals
       ↓
  SnarkJS verifies proof off-chain
       ↓
  Backend checks DID exists on blockchain
       ↓
  ✅ Authentication success / ❌ Failure
```

---

## 🧪 Generate & Verify Proof Manually

```bash
cd circuits

# Create input.json
cat > input.json << 'EOF'
{
  "secret": "12345678"
}
EOF

# Generate witness
node build/auth_js/generate_witness.js build/auth_js/auth.wasm input.json build/witness.wtns

# Generate proof
snarkjs groth16 prove build/auth_0001.zkey build/witness.wtns build/proof.json build/public.json

# Verify proof
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json
# Output: OK!

# View proof
cat build/proof.json
cat build/public.json
```

---

## 🌐 Deployment

### Smart Contract → Sepolia Testnet

```bash
cd contracts

# Add to .env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key

npx hardhat run scripts/deploy.js --network sepolia
```

### Backend → Render.com

1. Push `backend/` to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set environment variables in Render dashboard
4. Deploy

### Frontend → Vercel

```bash
cd frontend
npm run build
npx vercel --prod
```

Or connect GitHub repo to [vercel.com](https://vercel.com) for automatic deployments.

---

## 📚 Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Ethereum (Solidity, Hardhat) |
| ZKP | Circom 2.x + SnarkJS (Groth16) |
| Hash Function | Poseidon (ZK-friendly) |
| Backend | Node.js + Express + ethers.js |
| Frontend | React.js + ethers.js |
| Wallet | MetaMask |
| Testnet | Ethereum Sepolia |

---

## ⚠️ Notes for Evaluators

- The ZKP uses **Groth16** proving scheme with **Poseidon hash** (ZK-friendly, used in Zcash/StarkWare)
- The circuit proves knowledge of a `secret` such that `Poseidon(secret) == hash` without revealing `secret`
- This is a **simulation-friendly** setup; production would use a trusted setup ceremony with multiple parties
- MetaMask must be connected to the correct network (localhost:8545 for local, Sepolia for testnet)
