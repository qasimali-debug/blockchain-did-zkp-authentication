import React, { useState } from "react";
import { computePoseidonHash, generateZKProof } from "../utils/zkp";
import { isValidDID } from "../utils/did";
import { apiVerify } from "../utils/api";
import StatusBox from "../components/StatusBox";
import DIDGenerator from "../components/DIDGenerator";
import "./FormPage.css";

const STEPS_INFO = [
  "Enter DID + secret",
  "Generate unique nonce (anti-replay)",
  "Generate ZK-SNARK proof in browser",
  "Backend verifies proof + checks nonce",
];

export default function LoginPage() {
  const [did, setDid]       = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [proofData, setProofData] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!did.trim()) {
      return setStatus({ type: "error", title: "Validation Error", message: "DID is required." });
    }
    if (!isValidDID(did.trim())) {
      return setStatus({ type: "error", title: "Invalid DID", message: "DID format is invalid. Example: did:ethr:0x7a69:0xYourAddress" });
    }
    if (!secret) {
      return setStatus({ type: "error", title: "Validation Error", message: "Secret is required." });
    }

    setLoading(true);
    setStatus(null);
    setProofData(null);

    try {
      // Step 1: hash secret
      setActiveStep(0);
      setStatus({ type: "loading", title: "Step 1/4", message: "Computing Poseidon hash locally..." });
      const { hash } = await computePoseidonHash(secret);

      // Step 2: generate nonce (happens inside generateZKProof)
      setActiveStep(1);
      setStatus({ type: "loading", title: "Step 2/4", message: "Generating cryptographic nonce for anti-replay protection..." });

      // Step 3: generate full ZK proof with nonce
      setActiveStep(2);
      setStatus({
        type: "loading",
        title: "Step 3/4",
        message: "Generating Zero-Knowledge proof in browser (this takes a few seconds)...",
      });
      const { proof, publicSignals, nonceHash } = await generateZKProof(secret, hash);
      setProofData({ proof, publicSignals });

      // Step 4: verify on backend
      setActiveStep(3);
      setStatus({ type: "loading", title: "Step 4/4", message: "Sending proof to backend for verification..." });
      const result = await apiVerify(did.trim(), proof, publicSignals);

      if (result.authenticated) {
        setStatus({
          type: "success",
          title: "Authentication Successful!",
          message: "ZK proof verified. Your identity is confirmed without revealing your secret.",
          details: {
            "DID":             did.trim(),
            "ZK Proof":        "✓ Valid (Groth16)",
            "On-chain hash":   "✓ Matches",
            "Replay check":    "✓ Nonce consumed — proof cannot be reused",
            "Secret":          "🔒 Never transmitted",
            "nonceHash":       nonceHash ? nonceHash.slice(0, 16) + "..." : "—",
          },
        });
      } else {
        setStatus({ type: "error", title: "Authentication Failed", message: result.error || "Proof invalid or DID not found." });
      }
    } catch (err) {
      setStatus({ type: "error", title: "Login Failed", message: err.message });
    } finally {
      setLoading(false);
      setActiveStep(-1);
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-tag mono">STEP 02</div>
        <h1 className="page-title">Login with ZKP</h1>
        <p className="page-subtitle">
          Prove you know your secret without revealing it.
          Each login generates a <strong>unique, unreplayable</strong> Zero-Knowledge proof.
        </p>
      </div>

      <div className="progress-steps">
        {STEPS_INFO.map((s, i) => (
          <div key={i} className={`progress-step ${activeStep === i ? "active" : ""} ${activeStep > i ? "done" : ""}`}>
            <div className="progress-dot">{activeStep > i ? "✓" : i + 1}</div>
            <div className="progress-label">{s}</div>
          </div>
        ))}
      </div>

      <form className="auth-form" onSubmit={handleLogin}>
        <DIDGenerator value={did} onSelect={(d) => setDid(d)} />

        <div className="field">
          <label className="field-label">Secret Password</label>
          <div className="input-row">
            <input
              className="field-input"
              type={showSecret ? "text" : "password"}
              placeholder="Enter your secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
          <span className="field-hint">
            Your secret never leaves your browser — only the ZK proof is sent.
          </span>
        </div>

        <button type="submit" className="submit-btn submit-btn-green" disabled={loading}>
          {loading ? (<span className="btn-loading"><span className="spinner" /> Generating Proof...</span>) : "Generate Proof & Login →"}
        </button>
      </form>

      {status && <StatusBox type={status.type} title={status.title} message={status.message} details={status.details} />}

      {proofData && (
        <details className="proof-details">
          <summary className="proof-summary mono">View raw ZK proof ↓</summary>
          <div className="proof-content">
            <div className="proof-label mono">proof.json</div>
            <pre className="proof-json">{JSON.stringify(proofData.proof, null, 2)}</pre>
            <div className="proof-label mono" style={{ marginTop: "1rem" }}>publicSignals.json — [hash, nonceHash]</div>
            <pre className="proof-json">{JSON.stringify(proofData.publicSignals, null, 2)}</pre>
          </div>
        </details>
      )}

      <div className="info-panel">
        <div className="info-title mono">Anti-Replay Protection</div>
        <ul className="info-list">
          <li><strong>Old (vulnerable):</strong> same secret → same proof every time → replayable</li>
          <li><strong>Fixed:</strong> each login generates a random <span className="mono">nonce</span> → unique <span className="mono">nonceHash = Poseidon(secret, nonce)</span></li>
          <li>Backend stores used nonceHashes and rejects duplicates immediately</li>
          <li>Even if an attacker captures your proof, it cannot be reused — the nonce is consumed</li>
        </ul>
      </div>
    </div>
  );
}
