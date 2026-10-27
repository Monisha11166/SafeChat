const { Server } = require("socket.io");
const User = require("./models/User");
const CallLog = require("./models/CallLog");

let io;
const onlineUsers = new Map();

// Tracks calls that are ringing/connecting but not yet finished, so
// the matching CallLog document can be found and completed when the
// call is answered, declined, or ended — regardless of which side
// (caller or callee) that event comes from.
// key: sorted "userIdA:userIdB" pair -> { logId, callerId, calleeId, connectedAt }
const activeCalls = new Map();
const pairKey = (a, b) => [a, b].sort().join(":");

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // User comes online
    socket.on("registerUser", async (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.data.userId = userId;

      await User.findByIdAndUpdate(userId, {
        status: "Online",
      });

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));

      console.log(`✅ User ${userId} is Online`);
    });

    // User is typing
    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("userTyping", {
          senderId,
        });
      }
    });

    // User stopped typing
    socket.on("stopTyping", ({ senderId, receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("userStoppedTyping", {
          senderId,
        });
      }
    });

    // Message Delivered
    socket.on("messageDelivered", ({ senderId, messageId }) => {
      const senderSocket = onlineUsers.get(senderId);

      if (senderSocket) {
        io.to(senderSocket).emit("messageDelivered", {
          messageId,
        });
      }
    });

    // Message Read
    socket.on("messageRead", ({ senderId, messageId }) => {
      const senderSocket = onlineUsers.get(senderId);

      if (senderSocket) {
        io.to(senderSocket).emit("messageRead", {
          messageId,
        });
      }
    });

    // =======================
    // WebRTC Call Signaling
    // (server only relays — it never touches audio/video data,
    // that flows peer-to-peer once the connection is established)
    // =======================

    // Caller starts a call
    socket.on("call-user", async ({ to, from, offer, callType, callerName, callerProfilePic }) => {
      const targetSocket = onlineUsers.get(to);

      if (!targetSocket) {
        // Callee isn't online — tell the caller immediately, and log
        // it as a completed (offline) attempt right away since there's
        // no further events coming for this one.
        try {
          await CallLog.create({
            callerId: from,
            calleeId: to,
            callType,
            status: "offline",
            startedAt: new Date(),
            endedAt: new Date(),
          });
        } catch (err) {
          console.error("Failed to log offline call attempt:", err.message);
        }

        io.to(socket.id).emit("call-failed", {
          reason: "User is offline",
        });
        return;
      }

      try {
        const log = await CallLog.create({
          callerId: from,
          calleeId: to,
          callType,
          status: "missed", // updated to "completed" if/when answered
          startedAt: new Date(),
        });

        activeCalls.set(pairKey(from, to), {
          logId: log._id,
          callerId: from,
          calleeId: to,
        });
      } catch (err) {
        console.error("Failed to log call attempt:", err.message);
      }

      io.to(targetSocket).emit("incoming-call", {
        callerProfilePic,
        from,
        offer,
        callType,
        callerName,
      });
    });

    // Callee accepts
    socket.on("call-answer", async ({ to, answer }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit("call-answered", { answer });
      }

      const callerId = to; // "to" here is the original caller's id
      const calleeId = socket.data.userId;
      const active = activeCalls.get(pairKey(callerId, calleeId));

      if (active) {
        active.connectedAt = new Date();
        try {
          await CallLog.findByIdAndUpdate(active.logId, {
            status: "completed",
            connectedAt: active.connectedAt,
          });
        } catch (err) {
          console.error("Failed to log call answer:", err.message);
        }
      }
    });

    // Callee rejects, or caller cancels before pickup
    socket.on("call-rejected", async ({ to }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit("call-rejected");
      }

      const key = pairKey(to, socket.data.userId);
      const active = activeCalls.get(key);

      if (active) {
        try {
          await CallLog.findByIdAndUpdate(active.logId, {
            status: "declined",
            endedAt: new Date(),
          });
        } catch (err) {
          console.error("Failed to log call rejection:", err.message);
        }
        activeCalls.delete(key);
      }
    });

    // ICE candidate exchange (both directions, relayed as-is)
    socket.on("ice-candidate", ({ to, candidate }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit("ice-candidate", { candidate });
      }
    });

    // Either side hangs up
    socket.on("call-ended", async ({ to }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit("call-ended");
      }

      const key = pairKey(to, socket.data.userId);
      const active = activeCalls.get(key);

      if (active) {
        const endedAt = new Date();
        const connected = !!active.connectedAt;
        const durationSeconds = connected
          ? Math.max(0, Math.round((endedAt - active.connectedAt) / 1000))
          : 0;

        try {
          await CallLog.findByIdAndUpdate(active.logId, {
            status: connected ? "completed" : "missed",
            endedAt,
            durationSeconds,
          });
        } catch (err) {
          console.error("Failed to log call end:", err.message);
        }
        activeCalls.delete(key);
      }
    });

    // User disconnects
    socket.on("disconnect", async () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);

          await User.findByIdAndUpdate(userId, {
            status: "Offline",
            lastSeen: new Date(),
          });

          break;
        }
      }

      // If this user had a call in progress and never got a clean
      // "call-ended"/"call-rejected" (app closed, network dropped),
      // finalize that log now instead of leaving it open forever.
      const disconnectedId = socket.data.userId;
      if (disconnectedId) {
        for (const [key, active] of activeCalls.entries()) {
          if (
            active.callerId === disconnectedId ||
            active.calleeId === disconnectedId
          ) {
            const endedAt = new Date();
            const connected = !!active.connectedAt;
            const durationSeconds = connected
              ? Math.max(0, Math.round((endedAt - active.connectedAt) / 1000))
              : 0;

            try {
              await CallLog.findByIdAndUpdate(active.logId, {
                status: connected ? "completed" : "missed",
                endedAt,
                durationSeconds,
              });
            } catch (err) {
              console.error("Failed to log call on disconnect:", err.message);
            }

            const otherId =
              active.callerId === disconnectedId
                ? active.calleeId
                : active.callerId;
            const otherSocket = onlineUsers.get(otherId);
            if (otherSocket) {
              io.to(otherSocket).emit("call-ended");
            }

            activeCalls.delete(key);
          }
        }
      }

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));

      console.log("🔴 User Disconnected:", socket.id);
    });
  });
};

const sendMessageToUser = (receiverId, message) => {
  const receiverSocket = onlineUsers.get(receiverId);

  if (receiverSocket) {
    io.to(receiverSocket).emit("receiveMessage", message);
  }
};

/**
 * Push a real-time risk alert to both participants' sockets
 * (in this project's scope "both participants" doubles as the
 * dashboard viewer; swap in a dedicated guardian/monitor room
 * if you add guardian accounts).
 */
const sendRiskAlert = (senderId, receiverId, riskDoc) => {
  const payload = {
    userA: riskDoc.userA,
    userB: riskDoc.userB,
    score: riskDoc.score,
    level: riskDoc.level,
    factors: riskDoc.factors,
    calculatedAt: riskDoc.lastCalculatedAt,
  };

  [senderId, receiverId].forEach((id) => {
    const socketId = onlineUsers.get(id.toString());
    if (socketId) {
      io.to(socketId).emit("riskAlert", payload);
    }
  });
};

module.exports = {
  initializeSocket,
  sendMessageToUser,
  sendRiskAlert,
};
