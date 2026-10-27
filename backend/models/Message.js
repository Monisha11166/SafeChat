const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      default: "",
    },

    // File URL
    file: {
      type: String,
      default: "",
    },

    // File Type (image, pdf, doc, etc.)
    fileType: {
      type: String,
      default: "",
    },

    // Message Delivered Status
    delivered: {
      type: Boolean,
      default: false,
    },

    // Message Read Status
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);