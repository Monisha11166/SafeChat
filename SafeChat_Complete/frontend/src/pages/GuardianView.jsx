import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaEnvelope,
  FaMobileAlt,
  FaShieldAlt,
  FaExclamationTriangle,
} from "react-icons/fa";

import API from "../services/api";
import "./GuardianView.css";

const LEVEL_COLOR = { Low: "#16a34a", Medium: "#f59e0b", High: "#dc2626" };

function timeAgo(date) {
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * "What the parent sees" — a demo-friendly view of the guardian side of
 * the product. Real parents never log into SafeChat; they only get email/
 * SMS. This page exists purely so you can SHOW that side during a demo
 * without needing a real inbox or phone to check.
 */
function GuardianView() {
  const navigate = useNavigate();
  const stored = JSON.parse(localStorage.getItem("user") || "null");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stored?._id) return;
    API.get(`/risk/guardian-view/${stored._id}`)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.response?.data?.message || "Could not load."))
      .finally(() => setLoading(false));
  }, [stored?._id]);

  if (loading) {
    return <div className="gv-shell"><p className="gv-loading">Loading guardian view…</p></div>;
  }
  if (!data) return null;

  const { child, guardianEmail, guardianPhone, summary, alerts } = data;
  const worst = summary.reduce(
    (acc, r) => (LEVEL_COLOR[r.level] && ["Low", "Medium", "High"].indexOf(r.level) > ["Low", "Medium", "High"].indexOf(acc) ? r.level : acc),
    "Low"
  );

  return (
    <div className="gv-shell">
      <div className="gv-topbar">
        <button className="gv-back" onClick={() => navigate("/dashboard")}>
          <FaArrowLeft /> Back to my dashboard
        </button>
        <span className="gv-tag">Demo: guardian-side preview</span>
      </div>

      <div className="gv-phone-frame">
        <div className="gv-phone-notch" />

        <div className="gv-phone-header">
          <FaShieldAlt />
          SafeChat Guardian Alerts
        </div>

        <div className="gv-phone-body">
          <p className="gv-intro">
            This is what <b>{child.username}'s</b> parent/guardian would see —
            rendered here only for demo purposes. In real use, guardians never
            log into SafeChat; they just receive these as email/SMS.
          </p>

          <div className="gv-contact-card">
            <div><FaEnvelope /> {guardianEmail || "Not set"}</div>
            <div><FaMobileAlt /> {guardianPhone || "Not set"}</div>
          </div>

          {!guardianEmail && !guardianPhone && (
            <div className="gv-warn">
              <FaExclamationTriangle /> No guardian contact on file — no alerts
              can be delivered for this account.
            </div>
          )}

          <div className="gv-status-banner" style={{ background: LEVEL_COLOR[worst] }}>
            Current highest risk: {worst}
          </div>

          <h3>Monitored conversations</h3>
          <div className="gv-conv-list">
            {summary.map((r) => {
              const other = r.userA?._id === stored._id ? r.userB : r.userA;
              return (
                <div className="gv-conv" key={r._id}>
                  <div
                    className="gv-conv-dot"
                    style={{ background: LEVEL_COLOR[r.level] }}
                  />
                  <div className="gv-conv-info">
                    <b>{other?.username || "Unknown"}</b>
                    <small>
                      {r.factors?.messageCount24h ?? 0} msgs/24h ·{" "}
                      {r.factors?.lateNightCount24h ?? 0} late-night ·{" "}
                      {r.factors?.activeDaysStreak ?? 0} active days
                    </small>
                  </div>
                  <span className="gv-pill" style={{ color: LEVEL_COLOR[r.level] }}>
                    {r.level}
                  </span>
                </div>
              );
            })}
          </div>

          <h3>Alerts received</h3>
          {alerts.length === 0 ? (
            <p className="gv-empty">No alerts sent yet for this account.</p>
          ) : (
            <div className="gv-alert-list">
              {alerts.map((a) => (
                <div className="gv-alert" key={a._id}>
                  <div className="gv-alert-head">
                    <span className="gv-alert-channel">
                      {a.channel === "email" ? <FaEnvelope /> : <FaMobileAlt />}
                      {a.channel.toUpperCase()}
                    </span>
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="gv-alert-body">
                    <b>{a.level} risk</b> detected in {child.username}'s conversation
                    with <b>{a.otherUsername || "a contact"}</b> (score {a.score}/10).
                    Sent to {a.recipientMasked}.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="gv-footnote">
        Want to see the raw calculator logic behind these numbers? See{" "}
        <code>backend/utils/riskCalculator.js</code> or run{" "}
        <code>node scripts/printTestCases.js</code>.
      </p>
    </div>
  );
}

export default GuardianView;
