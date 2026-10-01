import React, { useState } from "react";
import { connectWallet } from "../utils/wallet";
import { computePoseidonHash } from "../utils/zkp";
import { isValidDID } from "../utils/did";
import { apiRegister } from "../utils/api";
import StatusBox from "../components/StatusBox";
import DIDGenerator from "../components/DIDGenerator";
import "./FormPage.css";

const STEPS_INFO = [
  "Choose your DID + enter secret",
  "Frontend computes Poseidon(secret) — stays in browser",
  "MetaMask signs blockchain transaction",
  "DID + hash stored on Ethereum",
];

export default function RegisterPage() {
  const [did, setDid]         = useState("");
  const [secret, setSecret]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!did.trim()) {
      return setStatus({ type: "error", title: "Validation Error", message: "DID is required. Use the generator above." });
    }
    if (!isValidDID(did.trim())) {
      return setStatus({ type: "error", title: "Invalid DID", message: "DID format is invalid. Example: did:ethr:0x7a69:0xYourAddress" });
    }
    if (secret.length < 6) {
      return setStatus({ type: "error", title: "Validation Error", message: "Secret must be at least 6 characters." });
    }
    if (secret !== confirm) {
      return setStatus({ type: "error", title: "Validation Error", message: "Secrets do not match." });
    }
    setLoading(true);
    setStatus(null);
    try {
      setActiveStep(0);
      setStatus({ type: "loading", title: "Step 1/4", message: "Connecting MetaMask wallet..." });
      await connectWallet();

      setActiveStep(1);
      setStatus({ type: "loading", title: "Step 2/4", message: "Computing Poseidon hash locally..." });
      const { hash } = await computePoseidonHash(secret);

      setActiveStep(2);
      setStatus({ type: "loading", title: "Step 3/4", message: "Sending transaction to blockchain..." });
      const result = await apiRegister(did.trim(), hash);

      setActiveStep(3);
      setStatus({
        type: "success",
        title: "Registration Successful!",
        message: "Your DID and hashed secret are stored on Ethereum. You can now login with ZKP.",
        details: {
          "DID":           did.trim(),
          "Hash (public)": hash.slice(0, 20) + "...",
          "TX Hash":       result.txHash ? result.txHash.slice(0, 18) + "..." : "confirmed",
          "Block":         result.blockNumber?.toString() || "—",
          "Secret":        "🔒 Never transmitted",
        },
      });
    } catch (err) {
      setStatus({ type: "error", title: "Registration Failed", message: err.message });
    } finally {
      setLoading(false);
      setActiveStep(-1);
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-tag mono">STEP 01</div>
        <h1 className="page-title">Register Identity</h1>
        <p className="page-subtitle">
          Create your decentralized identity. Your secret is hashed locally —
          only the hash is stored on Ethereum, never the secret itself.
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

      <form className="auth-form" onSubmit={handleRegister}>
        <DIDGenerator value={did} onSelect={(d) => setDid(d)} />

        <div className="field">
          <label className="field-label">Secret Password</label>
          <div className="input-row">
            <input
              className="field-input"
              type={showSecret ? "text" : "password"}
              placeholder="Enter a strong secret (min 6 chars)"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
          <span className="field-hint">Stays in your browser. Only Poseidon(secret) goes to blockchain.</span>
        </div>

        <div className="field">
          <label className="field-label">Confirm Secret</label>
          <input
            className="field-input"
            type="password"
            placeholder="Re-enter your secret"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (<span className="btn-loading"><span className="spinner" /> Processing...</span>) : "Register on Blockchain →"}
        </button>
      </form>

      {status && <StatusBox type={status.type} title={status.title} message={status.message} details={status.details} />}

      <div className="info-panel">
        <div className="info-title mono">Security guarantees</div>
        <ul className="info-list">
          <li>Secret hashed with <strong>Poseidon</strong> — ZK-friendly, one-way function</li>
          <li>Only the hash goes to Ethereum — your secret never leaves your browser</li>
          <li>Your DID is derived from your Ethereum wallet address</li>
          <li>Login uses ZKP with <strong>anti-replay nonces</strong> — each proof is unique</li>
        </ul>
      </div>
    </div>
  );
}
