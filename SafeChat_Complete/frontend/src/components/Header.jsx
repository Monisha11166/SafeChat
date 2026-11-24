import {
  FaPhoneAlt,
  FaVideo,
  FaEllipsisV,
  FaArrowLeft,
} from "react-icons/fa";
import RiskIndicator from "./RiskIndicator";
import Avatar from "./Avatar";
import "./Header.css";
import { useT } from "../i18n/LanguageContext";

function Header({
  contact,
  isTyping = false,
  onlineUsers = [],
  onStartCall = () => {},
  onBack = null,
}) {
  const { t } = useT();
  if (!contact) {
    return (
      <div className="chat-header">

        <div className="chat-user">

          <div className="chat-avatar">
            💬
          </div>

          <div className="chat-details">
            <h3>SafeChat</h3>
            <p>{t("selectContact")}</p>
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
            title={t("backToChats")}
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
          title={t("voiceCall")}
          onClick={() => onStartCall("audio")}
        >
          <FaPhoneAlt />
        </button>

        <button
          className="icon-btn"
          title={t("videoCall")}
          onClick={() => onStartCall("video")}
        >
          <FaVideo />
        </button>

        <button
          className="icon-btn"
          title={t("more")}
        >
          <FaEllipsisV />
        </button>

      </div>

    </div>
  );
}

export default Header;