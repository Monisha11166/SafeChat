import { mediaUrl } from "../services/api";
import "./Avatar.css";

const PALETTE = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2"];

function colorFor(name = "?") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Shows the user's real profile photo when they have one; otherwise a
 * WhatsApp-style colored circle with their initial. Used everywhere a
 * person's picture appears: sidebar, chat header, message bubbles, calls.
 */
function Avatar({ src, name = "?", size = 40, online = false, className = "" }) {
  const resolved = mediaUrl(src);

  return (
    <div
      className={`avatar-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      {resolved ? (
        <img
          src={resolved}
          alt={name}
          className="avatar-img"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="avatar-fallback"
        style={{
          background: colorFor(name),
          display: resolved ? "none" : "flex",
          fontSize: size * 0.42,
        }}
      >
        {name?.charAt(0)?.toUpperCase() || "?"}
      </div>
      {online && <span className="avatar-online-dot" />}
    </div>
  );
}

export default Avatar;
