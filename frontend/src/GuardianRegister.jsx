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
  FaChild,
} from "react-icons/fa";

import API from "./services/api";
import AuthLayout from "./components/AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isPhone = (v) => v.replace(/\D/g, "").length >= 10;

/**
 * Registration for a PARENT / GUARDIAN account. This is separate from the
 * chat account above: guardians log in to a read-only dashboard, never to
 * chat. They're linked to their child automatically — no code to enter —
 * by matching this email/phone against the guardianEmail/guardianPhone
 * the child entered on their own registration.
 */
function GuardianRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validate = () => {
    const f = formData;
    if (!f.username.trim() || !f.email.trim() || !f.password) {
      return "Please fill in your name, email and password.";
    }
    if (!EMAIL_RE.test(f.email.trim())) return "Enter a valid email address.";
    if (f.phone.trim() && !isPhone(f.phone)) return "Enter a valid phone number, or leave it blank.";
    if (f.password.length < 6) return "Password must be at least 6 characters.";
    if (f.password !== f.confirmPassword) return "Passwords do not match.";
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
      const res = await API.post("/users/register-guardian", {
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      const { linkedCount } = res.data;
      if (linkedCount > 0) {
        toast.success(`Account created — linked to ${linkedCount} child account(s) already.`);
      } else {
        toast.success(
          "Account created. No child account uses this email/phone as their guardian contact yet — " +
            "once your child adds it in their app, you'll see them here automatically."
        );
      }
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h1>Parent / guardian sign-up</h1>
        <p className="subtitle">
          Create an account to view your child's safety alerts. You'll be
          linked automatically to any child account that lists this email or
          phone as their guardian contact — no code needed.
        </p>

        <form onSubmit={handleRegister}>
          <div className="field">
            <label htmlFor="username">Your name</label>
            <div className="input-wrap">
              <FaUser className="input-icon" />
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Your full name"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="input-wrap">
              <FaEnvelope className="input-icon" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com — must match what your child entered"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="phone">Phone (optional)</label>
            <div className="input-wrap">
              <FaPhoneAlt className="input-icon" />
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap has-eye">
                <FaLock className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="info-box">
            <FaChild style={{ marginRight: 6 }} />
            This account only ever shows risk levels and alert history — it
            never shows chat messages.
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create guardian account"}
          </button>
        </form>

        <p className="auth-alt">
          Already have a guardian account?
          <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-alt">
          Not a parent?
          <Link to="/register">Create a regular account</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default GuardianRegister;
