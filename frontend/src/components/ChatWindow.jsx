import { useEffect, useRef } from "react";
import { FaFileAlt, FaDownload } from "react-icons/fa";
import { mediaUrl } from "../services/api";
import "./ChatWindow.css";

function ChatWindow({ messages = [] }) {
  const bottomRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="empty-chat">
        <div className="empty-chat-content">
          <img
            src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png"
            alt="Chat"
            className="empty-image"
          />

          <h2>Welcome to SafeChat</h2>

          <p>Select a contact and start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {messages.map((msg, index) => {
        const senderId =
          typeof msg.senderId === "object"
            ? msg.senderId?._id
            : msg.senderId;

        const isSender = senderId === user?._id;

        return (
          <div
            key={msg._id || index}
            className={`message-row ${
              isSender ? "sent-row" : "received-row"
            }`}
          >
            <div
              className={`message ${
                isSender ? "sent" : "received"
              }`}
            >
              {msg.file && msg.fileType?.startsWith("image/") && (
                <img
                  src={mediaUrl(msg.file)}
                  alt="Shared"
                  className="chat-image"
                />
              )}

              {msg.file && !msg.fileType?.startsWith("image/") && (
                <a
                  href={mediaUrl(msg.file)}
                  target="_blank"
                  rel="noreferrer"
                  className="chat-file"
                >
                  <FaFileAlt />
                  <span>{msg.file.split("/").pop()}</span>
                  <FaDownload />
                </a>
              )}

              {msg.message && (
                <div className="message-text">
                  {msg.message}
                </div>
              )}

              <div className="message-footer">
                <span className="message-time">
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>

                {isSender && (
                  <span
                    className={
                      msg.read
                        ? "ticks read"
                        : msg.delivered
                        ? "ticks delivered"
                        : "ticks sent"
                    }
                  >
                    {msg.delivered || msg.read ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef}></div>
    </div>
  );
}

export default ChatWindow;