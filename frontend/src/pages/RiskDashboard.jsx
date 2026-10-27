import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaShieldAlt,
  FaComments,
  FaChartPie,
  FaAddressBook,
  FaBell,
  FaSearch,
  FaSignOutAlt,
  FaSyncAlt,
  FaEnvelope,
  FaMobileAlt,
  FaExclamationTriangle,
  FaUserShield,
  FaPaperPlane,
} from "react-icons/fa";

import API from "../services/api";
import socket from "../socket";
import "./RiskDashboard.css";

const LEVEL_COLOR = { Low: "#16a34a", Medium: "#f59e0b", High: "#dc2626" };

function timeAgo(date) {
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Donut({ counts }) {
  const total = counts.High + counts.Medium + counts.Low;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width="150" height="150">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        {total > 0 &&
          ["High", "Medium", "Low"].map((lvl) => {
            const len = (counts[lvl] / total) * c;
            const el = (
              <circle
                key={lvl}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={LEVEL_COLOR[lvl]}
                strokeWidth="16"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += len;
            return el;
          })}
        <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="11" fill="#64748b">
          chats
        </text>
      </svg>
      <ul className="donut-legend">
        {["High", "Medium", "Low"].map((lvl) => (
          <li key={lvl}>
            <span className="dot" style={{ background: LEVEL_COLOR[lvl] }} />
            {lvl} <b>{counts[lvl]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ history = [], level }) {
  const pts = history.slice(-12).map((h) => h.score);
  if (pts.length < 2) return <span className="muted">—</span>;
  const w = 90;
  const h = 26;
  const max = Math.max(10, ...pts);
  const step = w / (pts.length - 1);
  const d = pts
    .map((p, i) => `${i * step},${h - (p / max) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h}>
      <polyline
        points={d}
        fill="none"
        stroke={LEVEL_COLOR[level] || "#2563eb"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RiskDashboard() {
  const navigate = useNavigate();
  const stored = JSON.parse(localStorage.getItem("user") || "null");

  const [me, setMe] = useState(stored);
  const [summary, setSummary] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [guardian, setGuardian] = useState({ guardianEmail: "", guardianPhone: "", guardianPreferredLanguage: "en" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    if (!stored?._id) return;
    try {
      const [s, a, u] = await Promise.all([
        API.get(`/risk/summary/${stored._id}`),
        API.get(`/risk/alerts/${stored._id}`),
        API.get("/users/me"),
      ]);
      setSummary(s.data || []);
      setAlerts(a.data || []);
      setMe(u.data.user);
      localStorage.setItem("user", JSON.stringify(u.data.user));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?._id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    socket.on("riskAlert", load);
    return () => socket.off("riskAlert", load);
  }, [load]);

  const counts = useMemo(() => {
    const c = { High: 0, Medium: 0, Low: 0 };
    summary.forEach((r) => (c[r.level] = (c[r.level] || 0) + 1));
    return c;
  }, [summary]);

  const otherParty = (row) =>
    row.userA?._id === stored?._id ? row.userB : row.userA;

  const rows = summary.filter((r) => {
    if (filter !== "All" && r.level !== filter) return false;
    const name = otherParty(r)?.username || "";
    return name.toLowerCase().includes(query.toLowerCase());
  });

  const saveGuardian = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await API.put("/users/guardian", guardian);
      setMe(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setEditing(false);
      toast.success("Guardian contact saved.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    try {
      setTesting(true);
      const res = await API.post("/users/guardian/test");
      const summaryText = res.data.results
        .map((r) => `${r.channel}: ${r.status}`)
        .join(", ");
      toast.success(`Test alert → ${summaryText}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Test failed.");
    } finally {
      setTesting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const hasGuardian = me?.guardianEmail || me?.guardianPhone;
  const alerts30 = alerts.filter((a) => a.kind !== "test").length;

  return (
    <div className="dash-shell">
      {/* ---------- Left navigation ---------- */}
      <nav className="dash-nav">
        <div className="dash-brand">
          <span className="logo-mark"><FaShieldAlt /></span>
          <span className="brand-text">SafeChat</span>
        </div>

        <NavLink to="/home" className="nav-item"><FaComments /><span>Chats</span></NavLink>
        <NavLink to="/dashboard" className="nav-item"><FaChartPie /><span>Safety dashboard</span></NavLink>
        <NavLink to="/contacts" className="nav-item"><FaAddressBook /><span>Contacts</span></NavLink>
        <NavLink to="/requests" className="nav-item"><FaBell /><span>Requests</span></NavLink>
        <NavLink to="/search" className="nav-item"><FaSearch /><span>Find people</span></NavLink>

        <button className="nav-item nav-logout" onClick={logout}>
          <FaSignOutAlt /><span>Log out</span>
        </button>
      </nav>

      {/* ---------- Main ---------- */}
      <div className="dash-main">
        <header className="dash-top">
          <div>
            <h1>Safety Dashboard</h1>
            <p>Behavioural risk signals only — message content is never analysed.</p>
          </div>
          <div className="dash-top-right">
            <Link to="/guardian-view" className="btn-ghost">
              <FaUserShield /> Preview as parent
            </Link>
            <button className="btn-ghost" onClick={load}>
              <FaSyncAlt /> Refresh
            </button>
            <div className="dash-user">
              <div className="avatar">{me?.username?.charAt(0).toUpperCase()}</div>
              <div>
                <b>{me?.username}</b>
                <small>{me?.email}</small>
              </div>
            </div>
          </div>
        </header>

        {!hasGuardian && !loading && (
          <div className="banner-warn">
            <FaExclamationTriangle />
            <span>
              No parent/guardian contact on file — risk alerts can't be delivered.
              Add one below.
            </span>
            <button
              className="btn-ghost"
              onClick={() => {
                setGuardian({ guardianEmail: "", guardianPhone: "" });
                setEditing(true);
              }}
            >
              Add now
            </button>
          </div>
        )}

        {/* KPI cards */}
        <section className="kpi-grid">
          <div className="kpi">
            <span className="kpi-label">Conversations monitored</span>
            <span className="kpi-value">{summary.length}</span>
          </div>
          <div className="kpi kpi-high">
            <span className="kpi-label">High risk</span>
            <span className="kpi-value">{counts.High}</span>
          </div>
          <div className="kpi kpi-medium">
            <span className="kpi-label">Medium risk</span>
            <span className="kpi-value">{counts.Medium}</span>
          </div>
          <div className="kpi kpi-blue">
            <span className="kpi-label">Guardian alerts sent</span>
            <span className="kpi-value">{alerts30}</span>
          </div>
        </section>

        {/* Distribution + guardian */}
        <section className="two-col">
          <div className="card">
            <h3>Risk distribution</h3>
            <Donut counts={counts} />
          </div>

          <div className="card">
            <div className="card-head">
              <h3><FaUserShield /> Parent / guardian contact</h3>
              {!editing && (
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setGuardian({
                      guardianEmail: me?.guardianEmail || "",
                      guardianPhone: me?.guardianPhone || "",
                      guardianPreferredLanguage: me?.guardianPreferredLanguage || "en",
                    });
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form className="guardian-form" onSubmit={saveGuardian}>
                <label>Guardian email</label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={guardian.guardianEmail}
                  onChange={(e) => setGuardian({ ...guardian, guardianEmail: e.target.value })}
                />
                <label>Guardian phone</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={guardian.guardianPhone}
                  onChange={(e) => setGuardian({ ...guardian, guardianPhone: e.target.value })}
                />
                <label>Alert language</label>
                <select
                  value={guardian.guardianPreferredLanguage || "en"}
                  onChange={(e) => setGuardian({ ...guardian, guardianPreferredLanguage: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-solid" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <ul className="contact-list">
                  <li><FaEnvelope /> {me?.guardianEmail || <span className="muted">Not set</span>}</li>
                  <li><FaMobileAlt /> {me?.guardianPhone || <span className="muted">Not set</span>}</li>
                </ul>
                <button
                  className="btn-solid"
                  disabled={!hasGuardian || testing}
                  onClick={sendTest}
                >
                  <FaPaperPlane /> {testing ? "Sending..." : "Send test alert"}
                </button>
                <p className="muted small">
                  Alerts go out automatically when a chat reaches Medium/High risk.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Conversations table */}
        <section className="card">
          <div className="card-head wrap">
            <h3>Conversations</h3>
            <div className="table-tools">
              <div className="chips">
                {["All", "High", "Medium", "Low"].map((f) => (
                  <button
                    key={f}
                    className={`chip ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="search-mini">
                <FaSearch />
                <input
                  placeholder="Search contact"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <p className="muted pad">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="muted pad">No conversations match.</p>
          ) : (
            <div className="table-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Risk</th>
                    <th>Score</th>
                    <th>Msgs / 24h</th>
                    <th>Late-night</th>
                    <th>Active days</th>
                    <th>Trend</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const other = otherParty(row);
                    return (
                      <tr key={row._id}>
                        <td>
                          <div className="cell-user">
                            <div className="avatar sm">
                              {other?.username?.charAt(0).toUpperCase() || "?"}
                            </div>
                            {other?.username || "Unknown"}
                          </div>
                        </td>
                        <td>
                          <span className={`pill pill-${row.level.toLowerCase()}`}>{row.level}</span>
                        </td>
                        <td>
                          <div className="scorebar">
                            <div
                              style={{
                                width: `${(row.score / 10) * 100}%`,
                                background: LEVEL_COLOR[row.level],
                              }}
                            />
                          </div>
                          <small>{row.score}/10</small>
                        </td>
                        <td>{row.factors?.messageCount24h ?? 0}</td>
                        <td>{row.factors?.lateNightCount24h ?? 0}</td>
                        <td>{row.factors?.activeDaysStreak ?? 0}</td>
                        <td><Sparkline history={row.history} level={row.level} /></td>
                        <td className="muted">{timeAgo(row.lastCalculatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Alerts */}
        <section className="card">
          <h3>Recent guardian alerts</h3>
          {alerts.length === 0 ? (
            <p className="muted pad">No alerts sent yet.</p>
          ) : (
            <ul className="alert-list">
              {alerts.slice(0, 10).map((a) => (
                <li key={a._id}>
                  <span className={`alert-icon ${a.channel}`}>
                    {a.channel === "email" ? <FaEnvelope /> : <FaMobileAlt />}
                  </span>
                  <div className="alert-body">
                    <b>
                      {a.kind === "test" ? "Test alert" : `${a.level} risk`} · chat with{" "}
                      {a.otherUsername || "—"}
                    </b>
                    <small>
                      to {a.recipientMasked} · {timeAgo(a.createdAt)}
                    </small>
                  </div>
                  <span className={`status status-${a.status}`}>
                    {a.status === "simulated" ? "demo (not sent)" : a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default RiskDashboard;
