import React from "react";
import "./StatusBox.css";

/**
 * StatusBox — displays success, error, info, or loading states
 * Props:
 *   type: "success" | "error" | "info" | "loading"
 *   title: string
 *   message: string
 *   details: object (key-value pairs shown as mono rows)
 */
export default function StatusBox({ type = "info", title, message, details }) {
  const icons = {
    success: "✓",
    error: "✗",
    info: "◈",
    loading: "◌",
  };

  return (
    <div className={`status-box status-${type}`}>
      <div className="status-header">
        <span className="status-icon">{icons[type]}</span>
        <span className="status-title">{title}</span>
      </div>
      {message && <p className="status-message">{message}</p>}
      {details && (
        <div className="status-details">
          {Object.entries(details).map(([key, value]) => (
            <div className="status-row" key={key}>
              <span className="status-key">{key}</span>
              <span className="status-value mono">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
