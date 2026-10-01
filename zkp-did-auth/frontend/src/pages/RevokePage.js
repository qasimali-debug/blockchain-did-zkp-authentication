import React, { useState } from "react";
import { isValidDID } from "../utils/did";
import { apiRevoke } from "../utils/api";
import StatusBox from "../components/StatusBox";
import DIDGenerator from "../components/DIDGenerator";
import "./FormPage.css";
import "./RevokePage.css";

export default function RevokePage() {
  const [did, setDid]               = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey]       = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [status, setStatus]         = useState(null);
  const [loading, setLoading]       = useState(false);

  const handleRevoke = async (e) => {
    e.preventDefault();

    if (!did.trim())             return setStatus({ type: "error", title: "Validation Error", message: "DID is required." });
    if (!isValidDID(did.trim())) return setStatus({ type: "error", title: "Invalid DID", message: "DID format is invalid." });
    if (!privateKey.trim())      return setStatus({ type: "error", title: "Validation Error", message: "Wallet private key is required." });
    if (!confirmed)              return setStatus({ type: "error", title: "Confirmation Required", message: "Please tick the confirmation checkbox before revoking." });

    setLoading(true);
    setStatus({ type: "loading", title: "Revoking DID...", message: "Submitting revocation transaction to blockchain..." });

    try {
      const result = await apiRevoke(did.trim(), privateKey.trim());

      setStatus({
        type: "error", // red — this is a destructive permanent action
        title: "DID Successfully Revoked",
        message: "Your DID has been permanently revoked on the Ethereum blockchain. No further authentication is possible with this identity.",
        details: {
          "DID":       did.trim(),
          "TX Hash":   result.txHash ? result.txHash.slice(0, 18) + "..." : "confirmed",
          "Block":     result.blockNumber?.toString() || "—",
          "Status":    "⛔ Permanently Disabled",
        },
      });

      setPrivateKey("");
      setConfirmed(false);
    } catch (err) {
      setStatus({ type: "error", title: "Revocation Failed", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-tag mono" style={{ color: "var(--accent-red)" }}>⚠ DANGER ZONE</div>
        <h1 className="page-title">Revoke Identity</h1>
        <p className="page-subtitle">
          Permanently disable your DID on the blockchain.
          This action is <strong>irreversible</strong> — once revoked, this identity
          cannot be used for authentication ever again.
        </p>
      </div>

      <div className="revoke-warning">
        <div className="warning-icon">⚠</div>
        <div>
          <strong>This action is permanent and cannot be undone.</strong>
          <br />
          After revocation, the DID will be marked as disabled on-chain and all
          login attempts will be permanently rejected.
        </div>
      </div>

      <form className="auth-form" onSubmit={handleRevoke}>
        <DIDGenerator value={did} onSelect={(d) => setDid(d)} />

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
            Only the original registrant wallet can revoke this DID.
          </span>
        </div>

        <div className="confirm-checkbox">
          <input
            type="checkbox"
            id="confirm-revoke"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={loading}
          />
          <label htmlFor="confirm-revoke">
            I understand this action is <strong>permanent and irreversible</strong>.
            I want to permanently revoke this DID.
          </label>
        </div>

        <button
          type="submit"
          className="submit-btn revoke-btn"
          disabled={loading || !confirmed}
        >
          {loading ? (
            <span className="btn-loading"><span className="spinner" /> Revoking...</span>
          ) : "⛔ Permanently Revoke DID"}
        </button>
      </form>

      {status && (
        <StatusBox type={status.type} title={status.title} message={status.message} details={status.details} />
      )}

      <div className="info-panel">
        <div className="info-title mono">When to revoke your DID</div>
        <ul className="info-list">
          <li>Your wallet private key has been compromised</li>
          <li>You suspect unauthorised access to your identity</li>
          <li>You wish to permanently decommission this digital identity</li>
          <li>After revocation, register a new DID with a fresh wallet address</li>
        </ul>
      </div>
    </div>
  );
}
