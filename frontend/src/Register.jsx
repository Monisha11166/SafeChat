import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUserShield,
} from "react-icons/fa";

import API from "./services/api";
import AuthLayout from "./components/AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isPhone = (v) => v.replace(/\D/g, "").length >= 10;

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianPreferredLanguage: "en",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const f = formData;

    if (!f.username.trim() || !f.email.trim() || !f.phone.trim() || !f.password) {
      return "Please fill in all account fields.";
    }
    if (!EMAIL_RE.test(f.email.trim())) return "Enter a valid email address.";
    if (!isPhone(f.phone)) return "Enter a valid phone number.";
    if (f.password.length < 6) return "Password must be at least 6 characters.";
    if (f.password !== f.confirmPassword) return "Passwords do not match.";

    if (!f.guardianEmail.trim() && !f.guardianPhone.trim()) {
      return "Enter a parent/guardian email or phone number (at least one).";
    }
    if (f.guardianEmail.trim() && !EMAIL_RE.test(f.guardianEmail.trim())) {
      return "Guardian email is not valid.";
    }
    if (f.guardianPhone.trim() && !isPhone(f.guardianPhone)) {
      return "Guardian phone number is not valid.";
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }

    try {
      setLoading(true);

      await API.post("/users/register", {
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        guardianEmail: formData.guardianEmail.trim(),
        guardianPhone: formData.guardianPhone.trim(),
        guardianPreferredLanguage: formData.guardianPreferredLanguage,
      });

      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card wide">
        <h1>Create your account</h1>
        <p className="subtitle">
          Join SafeChat. A parent or guardian contact is required so they can
          be alerted if unsafe activity is detected.
        </p>

        <form onSubmit={handleRegister}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <div className="input-wrap">
              <FaUser className="input-icon" />
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <FaEnvelope className="input-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <div className="input-wrap">
                <FaPhoneAlt className="input-icon" />
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap has-eye">
                <FaLock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-wrap">
                <FaLock className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="section-label">
            <FaUserShield /> Parent / Guardian contact
          </div>

          <div className="info-box">
            Risk alerts are sent here by email and/or SMS. Provide at least one.
            Message content is never shared — only activity summaries.
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="guardianEmail">Guardian email</label>
              <div className="input-wrap">
                <FaEnvelope className="input-icon" />
                <input
                  id="guardianEmail"
                  type="email"
                  name="guardianEmail"
                  placeholder="parent@example.com"
                  value={formData.guardianEmail}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="guardianPhone">Guardian phone</label>
              <div className="input-wrap">
                <FaPhoneAlt className="input-icon" />
                <input
                  id="guardianPhone"
                  type="tel"
                  name="guardianPhone"
                  placeholder="9876543210"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="guardianPreferredLanguage">Alert language for guardian</label>
            <div className="input-wrap">
              <select
                id="guardianPreferredLanguage"
                name="guardianPreferredLanguage"
                value={formData.guardianPreferredLanguage}
                onChange={handleChange}
                style={{ width: "100%", border: "none", background: "transparent", padding: "0 14px", fontSize: "14.5px" }}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>
            <span className="hint">Alert emails/SMS will be written in this language.</span>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-alt">
          Already have an account?
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Register;
