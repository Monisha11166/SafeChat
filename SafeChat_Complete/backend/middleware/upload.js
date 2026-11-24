const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Absolute path + auto-create: git/zip drop empty folders, so on Render the
// "uploads" directory doesn't exist and multer fails with ENOENT.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
