import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const STEPS = [
  {
    phase: "REGISTER",
    color: "cyan",
    steps: [
      { n: "01", label: "Enter your DID + Secret" },
      { n: "02", label: "Frontend computes Poseidon(secret)" },
      { n: "03", label: "MetaMask signs tx → stores DID + hash on Ethereum" },
    ],
  },
  {
    phase: "LOGIN",
    color: "green",
    steps: [
      { n: "01", label: "Enter DID + Secret (stays in browser)" },
      { n: "02", label: "Frontend generates ZK-SNARK proof in browser" },
      { n: "03", label: "Proof sent to backend (no secret revealed)" },
      { n: "04", label: "Backend verifies proof + cross-checks on-chain hash" },
      { n: "05", label: "✓ Authenticated — secret never left your device" },
    ],
  },
];

const TECH = [
  { name: "Ethereum", desc: "Immutable DID registry via Solidity smart contract", tag: "Blockchain" },
  { name: "Circom + Groth16", desc: "ZK-SNARK circuit proving secret knowledge", tag: "ZKP" },
  { name: "Poseidon Hash", desc: "ZK-friendly hash — 8× cheaper than SHA-256 in circuits", tag: "Crypto" },
  { name: "SnarkJS", desc: "Browser-side proof generation & verification", tag: "Library" },
  { name: "MetaMask", desc: "Non-custodial wallet for blockchain interaction", tag: "Wallet" },
  { name: "React + Express", desc: "Frontend UI & REST API backend", tag: "Stack" },
];

export default function HomePage() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge mono">Final Year Project · Ethereum + ZKP</div>
        <h1 className="hero-title">
          Privacy-Preserving
          <br />
          <span className="hero-accent">Authentication</span>
        </h1>
        <p className="hero-subtitle">
          Authenticate on the blockchain without revealing your secret.
          <br />
          Powered by <strong>Decentralized Identifiers (DID)</strong> and{" "}
          <strong>Zero-Knowledge Proofs</strong>.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary">
            Register Identity →
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Login with ZKP
          </Link>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="section">
        <h2 className="section-title">Authentication Flow</h2>
        <div className="flows">
          {STEPS.map((phase) => (
            <div key={phase.phase} className={`flow-card flow-${phase.color}`}>
              <div className="flow-header">
                <span className="flow-phase mono">{phase.phase}</span>
              </div>
              <ol className="flow-steps">
                {phase.steps.map((s) => (
                  <li key={s.n} className="flow-step">
                    <span className="step-num mono">{s.n}</span>
                    <span className="step-label">{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="section">
        <h2 className="section-title">Tech Stack</h2>
        <div className="tech-grid">
          {TECH.map((t) => (
            <div className="tech-card" key={t.name}>
              <div className="tech-tag mono">{t.tag}</div>
              <div className="tech-name">{t.name}</div>
              <div className="tech-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Key insight */}
      <section className="insight-box">
        <div className="insight-icon">◈</div>
        <div>
          <strong>Zero-Knowledge Guarantee:</strong> The ZK proof mathematically
          proves you know the secret that hashes to the on-chain value — without
          transmitting, logging, or storing the secret anywhere.
        </div>
      </section>
    </div>
  );
}
