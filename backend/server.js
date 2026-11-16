const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const http = require("http");
const { initializeSocket } = require("./socket");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// ---------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------
// Sets a standard set of protective HTTP headers (no sniffing, no
// clickjacking via frames, hides the "X-Powered-By: Express" fingerprint,
// etc.). crossOriginResourcePolicy is relaxed to "cross-origin" because
// the frontend runs on a different port in dev and needs to load
// /uploads images and profile pictures directly in <img> tags.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // This is a JSON API, not a page that renders third-party HTML, so
    // the default CSP (meant for HTML responses) isn't needed here.
    contentSecurityPolicy: false,
  })
);

// CORS: set CLIENT_ORIGIN in .env to lock this down to your real frontend
// URL in production (e.g. https://myapp.com). Left unset, it stays
// permissive so local development (different ports) keeps working.
app.use(
  cors(
    process.env.CLIENT_ORIGIN
      ? { origin: process.env.CLIENT_ORIGIN, credentials: true }
      : {}
  )
);

// Caps request body size (protects against oversized-payload abuse).
// File uploads go through multer separately and aren't affected by this.
app.use(express.json({ limit: "2mb" }));

// Rate limiting: a loose general cap on the whole API, plus a much
// stricter cap on login/register/password-reset specifically, since those
// are the endpoints brute-force and credential-stuffing attacks target.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});
app.use("/api", generalLimiter);
app.use(
  [
    "/api/users/login",
    "/api/users/register",
    "/api/users/register-guardian",
    "/api/users/forgot-password",
    "/api/users/reset-password",
  ],
  authLimiter
);

// Upload Folder
app.use("/uploads", express.static("uploads"));

// MongoDB Connection
console.log(
  "MONGO_URI:",
  (process.env.MONGO_URI || "").replace(/\/\/.*@/, "//<redacted>@")
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Failed");
    console.log(err.message);
  });

// =======================
// Routes
// =======================
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const messageRoutes = require("./routes/messageRoutes");
const friendRequestRoutes = require("./routes/friendRequestRoutes");
const riskRoutes = require("./routes/riskRoutes");
const callRoutes = require("./routes/callRoutes");

// Register Routes
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friend-request", friendRequestRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/calls", callRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("SafeChat Backend Running...");
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});