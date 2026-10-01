import React, { useState, useEffect } from "react";
import { getCurrentAccount, connectWallet } from "../utils/wallet";
import { suggestDIDs, parseDID, isValidDID } from "../utils/did";
import "./DIDGenerator.css";

/**
 * DIDGenerator
 *
 * A standalone component that:
 *  1. Explains what a DID is
 *  2. Auto-generates a DID from the connected MetaMask wallet address
 *  3. Shows multiple format suggestions
 *  4. Validates any manually typed DID in real time
 *  5. Copies the selected DID with one click
 *
 * Props:
 *   onSelect(did) — called when user picks a DID
 *   value         — current DID value (controlled)
 */
export default function DIDGenerator({ onSelect, value }) {
  const [walletAddr, setWalletAddr] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [manualDID, setManualDID] = useState(value || "");
  const [validation, setValidation] = useState(null);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  // Load wallet on mount
  useEffect(() => {
    getCurrentAccount().then((addr) => {
      if (addr) loadSuggestions(addr);
    });
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value && value !== manualDID) setManualDID(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function loadSuggestions(addr) {
    setWalletAddr(addr);
    const s = suggestDIDs(addr);
    setSuggestions(s);
    // Auto-select the recommended one
    const recommended = s.find((x) => x.recommended);
    if (recommended && !value) {
      setManualDID(recommended.did);
      onSelect && onSelect(recommended.did);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { address } = await connectWallet();
      loadSuggestions(address);
    } catch (err) {
      alert(err.message);
    } finally {
      setConnecting(false);
    }
  }

  function handleManualInput(e) {
    const val = e.target.value;
    setManualDID(val);
    onSelect && onSelect(val);

    if (val.trim().length === 0) {
      setValidation(null);
      return;
    }
    const result = parseDID(val);
    setValidation(result);
  }

  function handleSuggestionClick(did) {
    setManualDID(did);
    setValidation(parseDID(did));
    onSelect && onSelect(did);
  }

  async function handleCopy() {
    if (!manualDID) return;
    await navigator.clipboard.writeText(manualDID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isValid = validation?.valid ?? (manualDID.length === 0 ? null : false);

  return (
    <div className="did-generator">
      {/* Header */}
      <div className="did-header">
        <span className="did-label">Decentralized Identifier (DID)</span>
        <button
          type="button"
          className="did-explainer-toggle"
          onClick={() => setShowExplainer(!showExplainer)}
        >
          {showExplainer ? "Hide" : "What is a DID?"}
        </button>
      </div>

      {/* Explainer */}
      {showExplainer && (
        <div className="did-explainer">
          <div className="explainer-title">What is a DID?</div>
          <p>
            A <strong>Decentralized Identifier (DID)</strong> is a W3C standard
            for a globally unique, self-sovereign identifier — like a username
            that <em>you</em> control, not a company.
          </p>
          <p>It always follows this format:</p>
          <div className="did-anatomy">
            <span className="part-did">did</span>
            <span className="part-colon">:</span>
            <span className="part-method">ethr</span>
            <span className="part-colon">:</span>
            <span className="part-network">0x7a69</span>
            <span className="part-colon">:</span>
            <span className="part-address">0xf39F...2266</span>
          </div>
          <div className="anatomy-labels">
            <span>prefix</span>
            <span>method</span>
            <span>network</span>
            <span>your wallet</span>
          </div>
          <ul className="explainer-list">
            <li><strong>did:</strong> — always the prefix</li>
            <li><strong>ethr</strong> — the method (Ethereum-based)</li>
            <li><strong>0x7a69</strong> — chain ID in hex (Hardhat=31337=0x7a69)</li>
            <li><strong>0xf39F...2266</strong> — your MetaMask wallet address</li>
          </ul>
          <div className="explainer-note">
            💡 Your DID is derived from your wallet — no sign-up needed.
            You own it forever, as long as you control the private key.
          </div>
        </div>
      )}

      {/* Wallet connect to auto-generate */}
      {!walletAddr ? (
        <div className="did-connect-prompt">
          <p className="connect-hint">Connect MetaMask to auto-generate your DID from your wallet address</p>
          <button
            type="button"
            className="did-connect-btn"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? "Connecting..." : "🦊 Auto-Generate from MetaMask"}
          </button>
        </div>
      ) : (
        <>
          {/* Suggestions */}
          <div className="did-suggestions-label mono">
            Choose a DID format for wallet {walletAddr.slice(0, 8)}...
          </div>
          <div className="did-suggestions">
            {suggestions.map((s) => (
              <button
                key={s.did}
                type="button"
                className={`suggestion-btn ${manualDID === s.did ? "selected" : ""} ${s.recommended ? "recommended" : ""}`}
                onClick={() => handleSuggestionClick(s.did)}
              >
                <div className="suggestion-top">
                  <span className="suggestion-label">{s.label}</span>
                  {s.recommended && <span className="suggestion-badge">Recommended</span>}
                </div>
                <span className="suggestion-did mono">{s.did}</span>
                <span className="suggestion-desc">{s.description}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Manual input with live validation */}
      <div className="did-manual">
        <div className="did-manual-label">
          {walletAddr ? "Or type a custom DID:" : "Enter your DID manually:"}
        </div>
        <div className="did-input-wrap">
          <input
            className={`did-input ${
              validation
                ? validation.valid
                  ? "input-valid"
                  : "input-error"
                : ""
            }`}
            type="text"
            placeholder="did:ethr:0x7a69:0xYourWalletAddress"
            value={manualDID}
            onChange={handleManualInput}
            spellCheck={false}
          />
          <button
            type="button"
            className="copy-btn"
            onClick={handleCopy}
            disabled={!manualDID}
            title="Copy DID"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {/* Validation feedback */}
        {validation && (
          <div className={`did-validation ${validation.valid ? "valid" : "invalid"}`}>
            {validation.valid ? (
              <span>
                ✓ Valid <strong>did:{validation.method}</strong>
                {validation.network && ` · network: ${validation.network}`}
                {validation.warning && (
                  <span className="validation-warning"> ⚠ {validation.warning}</span>
                )}
              </span>
            ) : (
              <span>✗ {validation.error}</span>
            )}
          </div>
        )}
      </div>

      {/* DID format hint */}
      <div className="did-format-hint mono">
        Format: <span className="hint-scheme">did</span>:
        <span className="hint-method">ethr</span>:
        <span className="hint-network">[network]</span>:
        <span className="hint-address">0xYourAddress</span>
      </div>
    </div>
  );
}