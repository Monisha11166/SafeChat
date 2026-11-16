import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaPhoneAlt,
  FaVideo,
  FaArrowUp,
  FaArrowDown,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Avatar from "../components/Avatar";
import "./CallHistory.css";

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatWhen(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${time}`;
  }

  return `${date.toLocaleDateString()}, ${time}`;
}

function CallHistory() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await API.get(`/calls/${user._id}`);
        setCalls(res.data || []);
      } catch (err) {
        console.log(err);
        setCalls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  return (
    <div className="calls-page">
      <div className="calls-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <FaArrowLeft />
        </button>
        <h2>Calls</h2>
      </div>

      {loading ? (
        <h3 className="empty-text">Loading call history...</h3>
      ) : calls.length === 0 ? (
        <h3 className="empty-text">No calls yet.</h3>
      ) : (
        calls.map((call) => {
          const isOutgoing = call.callerId?._id === user._id;
          const other = isOutgoing ? call.calleeId : call.callerId;
          const duration = formatDuration(call.durationSeconds);

          let statusLabel = "";
          let statusClass = "neutral";
          if (call.status === "completed") {
            statusLabel = duration || "Connected";
            statusClass = "completed";
          } else if (call.status === "declined") {
            statusLabel = isOutgoing ? "Declined" : "You declined";
            statusClass = "missed";
          } else if (call.status === "offline") {
            statusLabel = "Not reachable";
            statusClass = "missed";
          } else {
            statusLabel = isOutgoing ? "No answer" : "Missed call";
            statusClass = "missed";
          }

          return (
            <div key={call._id} className="call-card">
              <Avatar
                src={other?.profilePic}
                name={other?.username}
                size={48}
                className="call-avatar-sm"
              />

              <div className="call-info">
                <div className="call-name-row">
                  <span className="call-name">
                    {other?.username || "Unknown"}
                  </span>
                  {call.callType === "video" ? (
                    <FaVideo className="call-type-icon" />
                  ) : (
                    <FaPhoneAlt className="call-type-icon" />
                  )}
                </div>

                <div className={`call-status call-status--${statusClass}`}>
                  {statusClass === "missed" ? (
                    <FaTimesCircle className="direction-icon missed" />
                  ) : isOutgoing ? (
                    <FaArrowUp className="direction-icon outgoing" />
                  ) : (
                    <FaArrowDown className="direction-icon incoming" />
                  )}
                  {statusLabel}
                </div>
              </div>

              <div className="call-time">{formatWhen(call.startedAt)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default CallHistory;
