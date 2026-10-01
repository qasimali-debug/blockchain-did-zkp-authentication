require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" })); // proofs can be moderately large

// ── Routes ────────────────────────────────────────────────────────
app.use("/api", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "ZKP DID Auth Backend",
    version: "1.0.0",
    endpoints: {
      register: "POST /api/register",
      verify: "POST /api/verify",
      status: "GET /api/status/:did",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("─".repeat(50));
  console.log(`🚀 ZKP DID Auth Backend running`);
  console.log(`   Port:     ${PORT}`);
  console.log(`   Contract: ${process.env.CONTRACT_ADDRESS || "not set"}`);
  console.log(`   Network:  ${process.env.RPC_URL || "not set"}`);
  console.log("─".repeat(50));
});

module.exports = app;
