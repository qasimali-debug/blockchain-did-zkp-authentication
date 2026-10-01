import React, { useState } from "react";
import { computePoseidonHash } from "../utils/zkp";
import { isValidDID } from "../utils/did";
import { apiUpdate } from "../utils/api";
import StatusBox from "../components/StatusBox";
import DIDGenerator from "../components/DIDGenerator";
import "./FormPage.css";

const STEPS_INFO = [
  "Enter DID + new secret",
  "Compute new Poseidon hash locally",
  "Submit with your wallet private key",
  "New hash stored on blockchain",
];

export default function UpdatePage() {
  const [did, setDid]               = useState("");
  const [newSecret, setNewSecret]   = useState("");
  const [confirm, setConfirm]       = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showKey, setShowKey]       = useState(false);
  const [status, setStatus]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!did.trim())           return setStatus({ type: "error", title: "Validation Error", message: "DID is required." });
    if (!isValidDID(did.trim())) return setStatus({ type: "error", title: "Invalid DID", message: "DID format is invalid." });
    if (newSecret.length < 6)  return setStatus({ type: "error", title: "Validation Error", message: "New secret must be at least 6 characters." });
    if (newSecret !== confirm)  return setStatus({ type: "error", title: "Validation Error", message: "Secrets do not match." });
    if (!privateKey.trim())    return setStatus({ type: "error", title: "Validation Error", message: "Wallet private key is required to prove ownership." });

    setLoading(true);
    setStatus(null);

    try {
      setActiveStep(0);
      setStatus({ type: "loading", title: "Step 1/4", message: "Validating inputs..." });

      setActiveStep(1);
      setStatus({ type: "loading", title: "Step 2/4", message: "Computing new Poseidon hash locally..." });
      const { hash: newHash } = await computePoseidonHash(newSecret);

      setActiveStep(2);
      setStatus({ type: "loading", title: "Step 3/4", message: "Submitting update transaction to blockchain..." });
      const result = await apiUpdate(did.trim(), newHash, privateKey.trim());

      setActiveStep(3);
      setStatus({
        type: "success",
        title: "Secret Updated Successfully!",
        message: "Your new hashed secret is now stored on the Ethereum blockchain. Use your new secret to login.",
        details: {
          "DID":           did.trim(),
          "New Hash":      newHash.slice(0, 20) + "...",
          "TX Hash":       result.txHash ? result.txHash.slice(0, 18) + "..." : "confirmed",
          "Block":         result.blockNumber?.toString() || "—",
          "Old Secret":    "🗑️ Replaced on-chain",
        },
      });

      // Clear sensitive inputs
      setNewSecret("");
      setConfirm("");
      setPrivateKey("");
    } catch (err) {
      setStatus({ type: "error", title: "Update Failed", message: err.message });
    } finally {
      setLoading(false);
      setActiveStep(-1);
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-tag mono">MANAGE IDENTITY</div>
        <h1 className="page-title">Update Secret</h1>
        <p className="page-subtitle">
          Change your registered secret. The new Poseidon hash replaces the
          old one on-chain. Only the <strong>original registrant wallet</strong> can perform this action.
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

      <form className="auth-form" onSubmit={handleUpdate}>
        <DIDGenerator value={did} onSelect={(d) => setDid(d)} />

        <div className="field">
          <label className="field-label">New Secret Password</label>
          <div className="input-row">
            <input
              className="field-input"
              type={showSecret ? "text" : "password"}
              placeholder="Enter your new secret (min 6 chars)"
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Confirm New Secret</label>
          <input
            className="field-input"
            type="password"
            placeholder="Re-enter your new secret"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="field">
          <label className="field-label">Wallet Private Key (Proves Ownership)</label>
          <div className="input-row">
            <input
              className="field-input"
              type={showKey ? "text" : "password"}
              placeholder="0xYourWalletPrivateKey"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowKey(!showKey)}>
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <span className="field-hint">
            Required to prove you are the original registrant. Never stored by the server.
          </span>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <span className="btn-loading"><span className="spinner" /> Updating...</span>
          ) : "Update Secret on Blockchain →"}
        </button>
      </form>

      {status && (
        <StatusBox type={status.type} title={status.title} message={status.message} details={status.details} />
      )}

      <div className="info-panel">
        <div className="info-title mono">Important Notes</div>
        <ul className="info-list">
          <li>Only the wallet that originally registered this DID can update it</li>
          <li>Your old secret will no longer work for login after update</li>
          <li>The new Poseidon hash permanently replaces the old one on-chain</li>
          <li>Your private key is used only to sign the transaction — never stored</li>
        </ul>
      </div>
    </div>
  );
}
