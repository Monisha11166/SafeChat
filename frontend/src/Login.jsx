import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

import API from "./services/api";
import AuthLayout from "./components/AuthLayout";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: "", // email OR phone number
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Already signed in (e.g. reopening the installed app)? Skip straight
  // past the login screen instead of making them log in again.
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (token && user) {
      navigate(user.role === "guardian" ? "/guardian-dashboard" : "/home", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.identifier.trim() || !formData.password) {
      toast.error("Please enter your email/phone/username and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/users/login", {
        identifier: formData.identifier.trim(),
        password: formData.password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Guardian accounts land on a read-only parent dashboard instead of
      // the chat screen — they never see chat content, only risk alerts.
      navigate(res.data.user?.role === "guardian" ? "/guardian-dashboard" : "/home");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in with your email, phone number or username.</p>

        <form onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="identifier">Email, phone or username</label>
            <div className="input-wrap">
              <FaUser className="input-icon" />
              <input
                id="identifier"
                type="text"
                name="identifier"
                placeholder="Email, phone number or username"
                autoComplete="username"
                value={formData.identifier}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap has-eye">
              <FaLock className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
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

          <div className="auth-row-between">
            <Link to="/forgot-password" className="btn-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-alt">
          Don't have an account?
          <Link to="/register">Create one</Link>
        </p>
        <p className="auth-alt">
          Parent or guardian?
          <Link to="/guardian-register">Sign in to view your child's alerts</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
