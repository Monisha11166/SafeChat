import { useEffect, useState } from "react";
import API from "../services/api";
import socket from "../socket";
import "./RiskIndicator.css";

/**
 * Small badge that shows the current grooming-risk level for the
 * conversation between the logged-in user and `otherUserId`.
 * Fetches on mount/when the chat changes, then updates live via
 * the "riskAlert" socket event (fired only for High risk).
 */
function RiskIndicator({ otherUserId }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const [risk, setRisk] = useState({ score: 0, level: "Low" });

  useEffect(() => {
    if (!otherUserId || !user?._id) return;

    let cancelled = false;

    API.get(`/risk/${user._id}/${otherUserId}`)
      .then((res) => {
        if (!cancelled) setRisk(res.data);
      })
      .catch((err) => console.error("Failed to load risk:", err.message));

    return () => {
      cancelled = true;
    };
  }, [otherUserId, user?._id]);

  useEffect(() => {
    const handleAlert = (payload) => {
      const involvesThisChat =
        [payload.userA, payload.userB].includes(user?._id) &&
        [payload.userA, payload.userB].includes(otherUserId);

      if (involvesThisChat) {
        setRisk(payload);
      }
    };

    socket.on("riskAlert", handleAlert);
    return () => socket.off("riskAlert", handleAlert);
  }, [otherUserId, user?._id]);

  const levelClass = risk.level?.toLowerCase() || "low";

  return (
    <div className={`risk-indicator risk-${levelClass}`} title="Behavioral risk level (based on message frequency, timing, and repetition — not message content)">
      <span className="risk-dot" />
      <span className="risk-label">{risk.level || "Low"} Risk</span>
    </div>
  );
}

export default RiskIndicator;
