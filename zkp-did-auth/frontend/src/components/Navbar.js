import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { connectWallet, getCurrentAccount, onAccountChange } from "../utils/wallet";
import "./Navbar.css";

export default function Navbar() {
  const [account, setAccount]     = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const location = useLocation();

  useEffect(() => {
    getCurrentAccount().then(setAccount);
    onAccountChange((accounts) => setAccount(accounts[0] || null));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address } = await connectWallet();
      setAccount(address);
    } catch (err) {
      alert(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const navLinks = [
    { path: "/",        label: "Home" },
    { path: "/register", label: "Register" },
    { path: "/login",   label: "Login" },
    { path: "/update",  label: "Update" },
    { path: "/revoke",  label: "Revoke", danger: true },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">ZKP</span>
          <span className="logo-sub">·DID·AUTH</span>
          <span className="logo-bracket">]</span>
        </Link>

        <div className="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? "active" : ""} ${link.danger ? "nav-danger" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-wallet">
          {account ? (
            <div className="wallet-connected">
              <span className="wallet-dot" />
              <span className="wallet-addr mono">{shortAddr(account)}</span>
            </div>
          ) : (
            <button className="btn-connect" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
