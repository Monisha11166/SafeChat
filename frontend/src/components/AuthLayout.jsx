import { FaShieldAlt, FaChartLine, FaBell, FaUserFriends } from "react-icons/fa";
import "../Auth.css";

/**
 * Two-column layout shared by Login / Register / Forgot password:
 * brand panel on the left, the form card on the right.
 */
function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          <span className="logo-mark">
            <FaShieldAlt />
          </span>
          SafeChat
        </div>

        <div>
          <h2>Safer conversations,
            <br />
            protected by design.
          </h2>
          <p className="lead">
            SafeChat watches for unsafe activity patterns and keeps parents
            and guardians informed — without reading a single message.
          </p>

          <ul className="auth-features">
            <li>
              <span className="feat-icon"><FaChartLine /></span>
              Real-time risk scoring from message frequency, timing and repetition
            </li>
            <li>
              <span className="feat-icon"><FaBell /></span>
              Instant email / SMS alerts to parents or guardians
            </li>
            <li>
              <span className="feat-icon"><FaUserFriends /></span>
              Privacy-first: message content is never analysed or shared
            </li>
          </ul>
        </div>

        <small>© {new Date().getFullYear()} SafeChat · Online safety platform</small>
      </aside>

      <main className="auth-form-side">{children}</main>
    </div>
  );
}

export default AuthLayout;
