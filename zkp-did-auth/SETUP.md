# Setup Guide — ZKP DID Auth

## Prerequisites Checklist

Before you begin, ensure these are installed:

```bash
# 1. Node.js v18 or higher
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x or higher

# 2. MetaMask browser extension
# Download: https://metamask.io/download/

# 3. Circom v2.x (ZKP circuit compiler)
# Option A — Cargo (Rust):
cargo install circom
# Option B — Download binary: https://github.com/iden3/circom/releases
circom --version   # Should show 2.x.x

# 4. SnarkJS (global)
npm install -g snarkjs
snarkjs --version

# 5. Git
git --version
```

---

## Local Development — Step by Step

### 1. Clone and install

```bash
git clone <your-repo-url>
cd zkp-did-auth
bash install-all.sh
```

---

### 2. Set up the ZKP circuit

This is the most important step — it compiles the Circom circuit and generates cryptographic keys.

```bash
cd circuits
bash setup.sh
```

Expected output:
```
✅ Circuit compiled     → build/auth.r1cs
✅ Powers of Tau        → pot12_final.ptau
✅ Proving key          → build/auth_0001.zkey
✅ Verification key     → build/verification_key.json
✅ Verifier.sol         → contracts/contracts/Verifier.sol
```

> ⏱ This takes 2–5 minutes. The Powers of Tau ceremony is compute-intensive.

---

### 3. Copy circuit files to frontend

The React app needs the WASM and zkey files to generate proofs in the browser:

```bash
# From project root
mkdir -p frontend/public/circuits/auth_js

cp circuits/build/auth_js/auth.wasm      frontend/public/circuits/auth_js/auth.wasm
cp circuits/build/auth_0001.zkey         frontend/public/circuits/auth_0001.zkey
cp circuits/build/verification_key.json  frontend/public/circuits/verification_key.json
```

---

### 4. Start local Hardhat blockchain

Open a **new terminal** and keep it running:

```bash
cd contracts
npx hardhat node
```

You'll see 20 test accounts with 10000 ETH each. Copy any private key — you'll need it for `.env`.

---

### 5. Deploy smart contract

In a **second terminal**:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

Output:
```
✅ DIDAuth deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
📄 Deployment info saved to contracts/deployment.json
```

Copy the contract address.

---

### 6. Configure environment files

**Backend:**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3   ← from Step 5
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  ← from hardhat node output
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3   ← same address
```

---

### 7. Start the backend

In a **third terminal**:

```bash
cd backend
npm run dev
```

Output:
```
🚀 ZKP DID Auth Backend running
   Port:     5000
   Contract: 0x5FbDB2...
```

Test it:
```bash
curl http://localhost:5000/
# → {"status":"ok","service":"ZKP DID Auth Backend",...}
```

---

### 8. Start the frontend

In a **fourth terminal**:

```bash
cd frontend
npm start
```

Opens `http://localhost:3000` in your browser.

---

### 9. Configure MetaMask

1. Open MetaMask → Networks → Add Network
2. Add Hardhat local network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
3. Import a test account: Accounts → Import Account → paste a private key from hardhat node output

---

### 10. Test the full flow

1. **Register:**
   - Go to `http://localhost:3000/register`
   - Enter a DID (e.g. `did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
   - Enter a secret (e.g. `mysecret123`)
   - Click "Register on Blockchain"
   - Approve the MetaMask transaction

2. **Login:**
   - Go to `http://localhost:3000/login`
   - Enter the same DID and secret
   - Click "Generate Proof & Login"
   - Watch the ZK proof generate in the browser
   - See: "Authentication Successful!"

---

## Manual Proof Testing (CLI)

```bash
cd circuits

# Generate a proof for secret "mysecret123"
node scripts/generate_proof.js mysecret123

# Verify it manually
snarkjs groth16 verify \
  build/verification_key.json \
  build/public.json \
  build/proof.json
# Output: OK!
```

---

## Running Contract Tests

```bash
cd contracts
npx hardhat test
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MetaMask not found` | Install MetaMask extension and refresh |
| `Contract address not configured` | Check `.env` files in backend and frontend |
| `Verification key not found` | Run `bash setup.sh` in circuits/ first |
| `WASM file not found` | Copy circuit files to `frontend/public/circuits/` |
| `DID already registered` | Use a different DID string |
| `Hash mismatch` | You used a different secret than during registration |
| Proof generation hangs | Normal — WASM proof takes 5–15s in browser |
| MetaMask wrong network | Switch to Hardhat Local (Chain ID 31337) |

---

## Project Structure Summary

```
zkp-did-auth/
├── contracts/
│   ├── contracts/DIDAuth.sol      ← Main smart contract
│   ├── scripts/deploy.js          ← Deployment script
│   ├── test/DIDAuth.test.js       ← Contract tests
│   └── hardhat.config.js
│
├── circuits/
│   ├── auth.circom                ← ZKP circuit (Poseidon hash constraint)
│   ├── setup.sh                   ← Compile + trusted setup script
│   ├── scripts/generate_proof.js  ← CLI proof generator
│   └── build/                     ← Generated files (gitignored)
│
├── backend/
│   ├── src/
│   │   ├── index.js               ← Express server
│   │   ├── routes/auth.js         ← /register + /verify endpoints
│   │   └── services/
│   │       ├── blockchain.js      ← ethers.js blockchain integration
│   │       └── zkp.js             ← SnarkJS proof verification
│   └── .env.example
│
├── frontend/
│   ├── public/circuits/           ← WASM + zkey files (copy here)
│   └── src/
│       ├── pages/
│       │   ├── HomePage.js        ← Landing + flow explanation
│       │   ├── RegisterPage.js    ← DID + secret registration
│       │   └── LoginPage.js       ← ZKP proof generation + login
│       ├── components/
│       │   ├── Navbar.js          ← MetaMask wallet connection
│       │   └── StatusBox.js       ← Success/error/loading UI
│       └── utils/
│           ├── wallet.js          ← MetaMask + ethers.js helpers
│           ├── zkp.js             ← Poseidon hash + proof generation
│           └── api.js             ← Backend API calls
│
├── install-all.sh                 ← One-shot dependency installer
├── render.yaml                    ← Backend deployment (Render.com)
├── vercel.json                    ← Frontend deployment (Vercel)
└── README.md
```
