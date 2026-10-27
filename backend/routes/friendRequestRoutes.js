const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");
const Contact = require("../models/Contact");

// ======================================
// Send Friend Request
// ======================================
router.post("/send", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    console.log("SEND FRIEND REQUEST");
    console.log("Sender:", senderId);
    console.log("Receiver:", receiverId);

    // Check required fields
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "Sender ID and Receiver ID are required.",
      });
    }

    // Validate MongoDB ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID.",
      });
    }

    // Prevent sending request to self
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a friend request to yourself.",
      });
    }

    // Check sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found.",
      });
    }

    // Check receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    // Already contacts?
    const alreadyFriend = await Contact.findOne({
      userId: senderId,
      contactId: receiverId,
    });

    if (alreadyFriend) {
      return res.status(400).json({
        success: false,
        message: "Already in your contacts.",
      });
    }

    // Existing request
    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Friend request already sent.",
      });
    }

    // Reverse request
    const reverseRequest = await FriendRequest.findOne({
      sender: receiverId,
      receiver: senderId,
      status: "pending",
    });

    if (reverseRequest) {
      return res.status(400).json({
        success: false,
        message:
          "This user has already sent you a friend request. Please accept it from your requests.",
      });
    }

    // Create request
    const request = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Friend request sent successfully.",
      request,
    });
  } catch (error) {
    console.error("SEND REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// Get Received Friend Requests
// ======================================
router.get("/received/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID.",
      });
    }

    const requests = await FriendRequest.find({
      receiver: userId,
      status: "pending",
    })
      .populate("sender", "username email profilePic")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET RECEIVED REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// Accept Friend Request
// ======================================
router.put("/accept/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID.",
      });
    }

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request already processed.",
      });
    }

    request.status = "accepted";
    await request.save();

    // Sender -> Receiver
    const contact1 = await Contact.findOne({
      userId: request.sender,
      contactId: request.receiver,
    });

    if (!contact1) {
      await Contact.create({
        userId: request.sender,
        contactId: request.receiver,
      });
    }

    // Receiver -> Sender
    const contact2 = await Contact.findOne({
      userId: request.receiver,
      contactId: request.sender,
    });

    if (!contact2) {
      await Contact.create({
        userId: request.receiver,
        contactId: request.sender,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Friend request accepted successfully.",
      request,
    });
  } catch (error) {
    console.error("ACCEPT REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// Reject Friend Request
// ======================================
router.put("/reject/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID.",
      });
    }

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request already processed.",
      });
    }

    request.status = "rejected";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Friend request rejected successfully.",
      request,
    });
  } catch (error) {
    console.error("REJECT REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// Get Sent Friend Requests
// ======================================
router.get("/sent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID.",
      });
    }

    const requests = await FriendRequest.find({
      sender: userId,
      status: "pending",
    })
      .populate("receiver", "username email profilePic")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET SENT REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;