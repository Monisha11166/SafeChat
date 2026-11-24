const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { sendMessageToUser, sendRiskAlert } = require("../socket");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const riskService = require("../services/riskService");
const { maybeAlertGuardians } = require("../services/alertService");
const { encryptText, decryptText } = require("../utils/messageCrypto");

// =======================
// Send Text/File Message
// =======================
router.post(
  "/send",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { senderId, receiverId, message } = req.body;

      let file = "";
      let fileType = "";

      if (req.file) {
        file = `/uploads/${req.file.filename}`;
        fileType = req.file.mimetype;
      }

      const plainText = message || "";

      const newMessage = new Message({
        senderId,
        receiverId,
        // Encrypted at rest - see utils/messageCrypto.js. Falls back to
        // plain text automatically if no key is configured.
        message: encryptText(plainText),
        file,
        fileType,
        delivered: false,
        read: false,
      });

      await newMessage.save();

      // The sender/receiver should see the real text immediately, not the
      // ciphertext that's actually stored in the database.
      const outgoing = newMessage.toObject();
      outgoing.message = plainText;

      // Send instantly using Socket.IO
      sendMessageToUser(receiverId, outgoing);

      // ---- Risk calculation (non-invasive: metadata only) ----
      // Runs after the response-critical work; failures here must
      // never block message delivery.
      riskService
        .recalculateRiskForPair(senderId, receiverId)
        .then(async (riskDoc) => {
          // Live in-app alert for High risk
          if (riskDoc.level === "High") {
            sendRiskAlert(senderId, receiverId, riskDoc);
          }

          // Email / SMS to the parents/guardians of both participants
          // (only on escalation or after the cooldown - see alertService)
          await maybeAlertGuardians(riskDoc);
        })
        .catch((err) => {
          console.error("Risk calculation / guardian alert failed:", err.message);
        });

      res.status(201).json({
        message: "Message sent successfully",
        data: outgoing,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

// =======================
// Get Chat Messages
// =======================
router.get("/:senderId/:receiverId", authMiddleware, async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    const decrypted = messages.map((m) => {
      const obj = m.toObject();
      obj.message = decryptText(obj.message);
      return obj;
    });

    res.status(200).json(decrypted);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// =======================
// Mark Message as Delivered
// =======================
router.put("/delivered/:id", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { delivered: true },
      { new: true }
    );

    const data = message?.toObject();
    if (data) data.message = decryptText(data.message);

    res.status(200).json({
      message: "Message delivered",
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// =======================
// Mark Message as Read
// =======================
router.put("/read/:id", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    const data = message?.toObject();
    if (data) data.message = decryptText(data.message);

    res.status(200).json({
      message: "Message read",
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
