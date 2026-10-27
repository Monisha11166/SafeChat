import { useRef, useState } from "react";
import {
  FaSmile,
  FaPaperclip,
  FaPaperPlane,
  FaTimes,
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import "./MessageInput.css";

function MessageInput({ onSend }) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!message.trim() && !selectedImage) return;

    onSend({
      message: message.trim(),
      image: selectedImage,
    });

    setMessage("");
    setSelectedImage(null);
    setShowEmoji(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="message-input-wrapper">

      {showEmoji && (
        <div className="emoji-box">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="dark"
            lazyLoadEmojis={true}
          />
        </div>
      )}

      {selectedImage && (
        <div className="preview-box">

          {selectedImage.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Preview"
            />
          ) : (
            <div className="preview-file-chip">📎 {selectedImage.name}</div>
          )}

          <button
            className="remove-preview"
            onClick={() => setSelectedImage(null)}
          >
            <FaTimes />
          </button>

        </div>
      )}

      <div className="message-input-container">

        <button
          type="button"
          className="input-btn"
          onClick={() => setShowEmoji(!showEmoji)}
        >
          <FaSmile />
        </button>

        <button
          type="button"
          className="input-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <FaPaperclip />
        </button>

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setSelectedImage(e.target.files[0]);
            }
          }}
        />

        <input
          className="message-input"
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          type="button"
          className="send-button"
          onClick={handleSend}
        >
          <FaPaperPlane />
        </button>

      </div>

    </div>
  );
}

export default MessageInput;