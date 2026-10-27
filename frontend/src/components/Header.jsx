import {
  FaPhoneAlt,
  FaVideo,
  FaEllipsisV,
  FaArrowLeft,
} from "react-icons/fa";
import RiskIndicator from "./RiskIndicator";
import Avatar from "./Avatar";
import "./Header.css";

function Header({
  contact,
  isTyping = false,
  onlineUsers = [],
  onStartCall = () => {},
  onBack = null,
}) {
  if (!contact) {
    return (
      <div className="chat-header">

        <div className="chat-user">

          <div className="chat-avatar">
            💬
          </div>

          <div className="chat-details">
            <h3>SafeChat</h3>
            <p>Select a contact to start chatting</p>
          </div>

        </div>

      </div>
    );
  }

  const friend = contact.contactId || contact;

  const isOnline = onlineUsers.includes(friend?._id);

  return (
    <div className="chat-header">

      <div className="chat-user">

        {onBack && (
          <button
            className="icon-btn back-btn"
            title="Back to chats"
            onClick={onBack}
          >
            <FaArrowLeft />
          </button>
        )}

        <Avatar
          src={friend?.profilePic}
          name={friend?.username}
          size={44}
          online={isOnline}
          className="chat-avatar"
        />

        <div className="chat-details">

          <h3>{friend?.username}</h3>

          <p>
            {isTyping
              ? "Typing..."
              : isOnline
              ? "🟢 Online"
              : "⚪ Offline"}
          </p>

          <RiskIndicator otherUserId={friend?._id} />

        </div>

      </div>

      <div className="chat-actions">

        <button
          className="icon-btn"
          title="Voice Call"
          onClick={() => onStartCall("audio")}
        >
          <FaPhoneAlt />
        </button>

        <button
          className="icon-btn"
          title="Video Call"
          onClick={() => onStartCall("video")}
        >
          <FaVideo />
        </button>

        <button
          className="icon-btn"
          title="More"
        >
          <FaEllipsisV />
        </button>

      </div>

    </div>
  );
}

export default Header;