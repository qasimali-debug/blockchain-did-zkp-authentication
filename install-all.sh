#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  Root setup script — installs all project dependencies
#  Run from the project root: bash install-all.sh
# ─────────────────────────────────────────────────────────────────
set -e

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ZKP DID Auth — Full Project Setup"
echo "════════════════════════════════════════════════════════"
echo ""

# Check Node.js version
NODE_VER=$(node -v 2>/dev/null || echo "not found")
echo "Node.js: $NODE_VER"
if [[ "$NODE_VER" == "not found" ]]; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

echo ""
echo "📦 Installing Contracts dependencies..."
cd contracts && npm install && cd ..
echo "✅ contracts/node_modules ready"

echo ""
echo "📦 Installing Circuits dependencies..."
cd circuits && npm install && cd ..
echo "✅ circuits/node_modules ready"

echo ""
echo "📦 Installing Backend dependencies..."
cd backend && npm install && cd ..
echo "✅ backend/node_modules ready"

echo ""
echo "📦 Installing Frontend dependencies..."
cd frontend && npm install && cd ..
echo "✅ frontend/node_modules ready"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ All dependencies installed!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "  1. Set up ZKP circuit:"
echo "     cd circuits && bash setup.sh"
echo ""
echo "  2. Copy circuit files to frontend:"
echo "     mkdir -p frontend/public/circuits/auth_js"
echo "     cp circuits/build/auth_js/auth.wasm  frontend/public/circuits/auth_js/"
echo "     cp circuits/build/auth_0001.zkey      frontend/public/circuits/"
echo "     cp circuits/build/verification_key.json frontend/public/circuits/"
echo ""
echo "  3. Start local Hardhat node (new terminal):"
echo "     cd contracts && npx hardhat node"
echo ""
echo "  4. Deploy smart contract:"
echo "     cd contracts && npx hardhat run scripts/deploy.js --network localhost"
echo ""
echo "  5. Configure environment files:"
echo "     cp backend/.env.example  backend/.env"
echo "     cp frontend/.env.example frontend/.env"
echo "     # Edit both files with your CONTRACT_ADDRESS"
echo ""
echo "  6. Start backend (new terminal):"
echo "     cd backend && npm run dev"
echo ""
echo "  7. Start frontend (new terminal):"
echo "     cd frontend && npm start"
echo ""
echo "  Open http://localhost:3000 in your browser with MetaMask installed."
echo ""
