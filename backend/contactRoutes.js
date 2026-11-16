const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");

// Add Contact
router.post("/add", async (req, res) => {
  try {
    const { userId, contactId } = req.body;

    const existing = await Contact.findOne({
      user: userId,
      contact: contactId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Contact already exists",
      });
    }

    const contact = new Contact({
      user: userId,
      contact: contactId,
    });

    await contact.save();

    res.status(201).json({
      message: "Contact added successfully",
      contact,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// Get Contacts
router.get("/:userId", async (req, res) => {
  try {
    const contacts = await Contact.find({
      user: req.params.userId,
    }).populate("contact", "-password");

    res.json(contacts);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;