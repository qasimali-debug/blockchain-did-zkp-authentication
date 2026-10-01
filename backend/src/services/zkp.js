const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");

// Path to the verification key (generated during circuit setup)
const VKEY_PATH = path.join(
  __dirname,
  "../../../circuits/build/verification_key.json"
);

let verificationKey = null;

/**
 * Load verification key (cached after first load)
 */
function loadVerificationKey() {
  if (verificationKey) return verificationKey;

  if (!fs.existsSync(VKEY_PATH)) {
    throw new Error(
      `Verification key not found at: ${VKEY_PATH}\n` +
        `Run 'npm run setup' in the circuits/ directory first.`
    );
  }

  verificationKey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf8"));
  console.log("✅ Verification key loaded");
  return verificationKey;
}

/**
 * Verify a Groth16 ZK-SNARK proof
 *
 * @param {object} proof         - The proof object from snarkjs
 * @param {Array}  publicSignals - Public signals [hash]
 * @returns {boolean} true if proof is valid
 */
async function verifyZKProof(proof, publicSignals) {
  try {
    const vkey = loadVerificationKey();

    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    return isValid;
  } catch (err) {
    console.error("ZKP verification error:", err.message);
    return false;
  }
}

/**
 * Extract the hash (public signal) from publicSignals array
 * In our circuit: publicSignals[0] = Poseidon(secret) = hash
 *
 * @param {Array} publicSignals
 * @returns {string} hash as decimal string
 */
function extractHashFromSignals(publicSignals) {
  if (!publicSignals || publicSignals.length === 0) {
    throw new Error("Empty public signals");
  }
  return publicSignals[0].toString();
}

module.exports = {
  verifyZKProof,
  extractHashFromSignals,
};
