import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaEnvelope,
  FaMobileAlt,
  FaSyncAlt,
} from "react-icons/fa";

import API from "../services/api";
import Avatar from "../components/Avatar";
import "./GuardianDashboard.css";

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
 * The REAL parent/guardian dashboard — reached by actually logging in with
 * a guardian account (see GuardianRegister.jsx). Shows every linked child,
 * their current risk levels, and the alert history. Never shows chat
 * message content — only what the alert emails/SMS already said.
 */
function GuardianDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    API.get("/risk/my-children")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.response?.data?.message || "Could not load."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="gd-shell">
      <header className="gd-top">
        <div className="gd-brand">
          <FaShieldAlt /> SafeChat — Parent Dashboard
        </div>
        <div className="gd-top-actions">
          <button className="gd-btn" onClick={load}>
            <FaSyncAlt /> Refresh
          </button>
          <button className="gd-btn" onClick={logout}>
            <FaSignOutAlt /> Log out
          </button>
        </div>
      </header>

      <main className="gd-main">
        {loading && <p className="gd-muted">Loading…</p>}

        {!loading && data && data.children.length === 0 && (
          <div className="gd-empty">
            <p>
              No child account currently lists <b>{data.guardian.email}</b> as
              their guardian contact.
            </p>
            <p className="gd-muted">
              Once your child adds this email (or your phone number) as their
              guardian contact in their SafeChat app, their alerts will
              appear here automatically — no code or invite needed.
            </p>
          </div>
        )}

        {!loading &&
          data?.children.map(({ child, summary, alerts }) => {
            const worst = summary.reduce(
              (acc, r) =>
                ["Low", "Medium", "High"].indexOf(r.level) >
                ["Low", "Medium", "High"].indexOf(acc)
                  ? r.level
                  : acc,
              "Low"
            );
            return (
              <section className="gd-child-card" key={child._id}>
                <div className="gd-child-head">
                  <Avatar src={child.profilePic} name={child.username} size={48} />
                  <div className="gd-child-info">
                    <h2>{child.username}</h2>
                    <small>{child.email}</small>
                  </div>
                  <span className="gd-status" style={{ background: LEVEL_COLOR[worst] }}>
                    {worst} risk
                  </span>
                </div>

                <h3>Monitored conversations</h3>
                {summary.length === 0 ? (
                  <p className="gd-muted">No conversation activity yet.</p>
                ) : (
                  <div className="gd-conv-list">
                    {summary.map((r) => {
                      const other = r.userA?._id === child._id ? r.userB : r.userA;
                      return (
                        <div className="gd-conv" key={r._id}>
                          <span
                            className="gd-dot"
                            style={{ background: LEVEL_COLOR[r.level] }}
                          />
                          <div className="gd-conv-info">
                            <b>{other?.username || "Unknown"}</b>
                            <small>
                              {r.factors?.messageCount24h ?? 0} msgs/24h ·{" "}
                              {r.factors?.lateNightCount24h ?? 0} late-night ·{" "}
                              {r.factors?.activeDaysStreak ?? 0} active days
                            </small>
                          </div>
                          <span className="gd-pill" style={{ color: LEVEL_COLOR[r.level] }}>
                            {r.level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <h3>Alerts you've received</h3>
                {alerts.length === 0 ? (
                  <p className="gd-muted">No alerts sent yet.</p>
                ) : (
                  <div className="gd-alert-list">
                    {alerts.map((a) => (
                      <div className="gd-alert" key={a._id}>
                        <div className="gd-alert-head">
                          <span className="gd-alert-channel">
                            {a.channel === "email" ? <FaEnvelope /> : <FaMobileAlt />}
                            {a.channel.toUpperCase()}
                          </span>
                          <span>{timeAgo(a.createdAt)}</span>
                        </div>
                        {a.summaryText ? (
                          <p className="gd-alert-body">{a.summaryText}</p>
                        ) : (
                          <p className="gd-alert-body">
                            <b>{a.level} risk</b> in {child.username}'s conversation with{" "}
                            <b>{a.otherUsername || "a contact"}</b> (score {a.score}/10).
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
      </main>
    </div>
  );
}

export default GuardianDashboard;
