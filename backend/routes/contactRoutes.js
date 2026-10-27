const express = require("express");
const router = express.Router();

const Contact = require("../models/Contact");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// =========================
// Add Contact
// =========================
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { userId, contactId } = req.body;

    // Cannot add yourself
    if (userId === contactId) {
      return res.status(400).json({
        message: "You cannot add yourself.",
      });
    }

    // Check if contact exists
    const user = await User.findById(contactId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Prevent duplicate contacts
    const exists = await Contact.findOne({
      userId,
      contactId,
    });

    if (exists) {
      return res.status(400).json({
        message: "Contact already exists.",
      });
    }

    // Save contact
    const contact = new Contact({
      userId,
      contactId,
    });

    await contact.save();

    res.status(201).json({
      message: "Contact Added Successfully",
      contact,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// =========================
// Get Contacts
// =========================
router.get("/:userId", authMiddleware, async (req, res) => {
  try {

    const contacts = await Contact.find({
      userId: req.params.userId,
    }).populate(
      "contactId",
      "username email phone profilePic"
    );

    res.status(200).json(contacts);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// =========================
// Delete Contact
// =========================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {

    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found.",
      });
    }

    res.status(200).json({
      message: "Contact deleted successfully.",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;