import React from "react";
import "./MessageBubble.css";

function MessageBubble({
  message,
  sender,
  time,
  delivered = true,
  read = true,
}) {
  return (
    <div
      className={`message-row ${
        sender === "me" ? "message-right" : "message-left"
      }`}
    >
      <div
        className={`message-bubble ${
          sender === "me" ? "sent" : "received"
        }`}
      >
        <div className="message-text">
          {message}
        </div>

        <div className="message-footer">
          <span className="message-time">{time}</span>

          {sender === "me" && (
            <span
              className={`message-status ${
                read ? "read" : "delivered"
              }`}
            >
              {delivered ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;