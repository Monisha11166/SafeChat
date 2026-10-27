import { io } from "socket.io-client";

// Same backend URL as services/api.js - set VITE_SERVER_ORIGIN in
// production, falls back to localhost for local development.
const SOCKET_URL = import.meta.env.VITE_SERVER_ORIGIN || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("Socket Error:", err.message);
});

export default socket;