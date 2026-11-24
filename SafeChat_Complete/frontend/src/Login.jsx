import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

import API from "./services/api";
import AuthLayout from "./components/AuthLayout";
import { useT } from "./i18n/LanguageContext";

function Login() {
  const navigate = useNavigate();
  const { t } = useT();

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
      toast.error(t("enterCredentials"));
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
      toast.error(err.response?.data?.message || t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h1>{t("welcomeBack")}</h1>
        <p className="subtitle">{t("signInSubtitle")}</p>

        <form onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="identifier">{t("identifierLabel")}</label>
            <div className="input-wrap">
              <FaUser className="input-icon" />
              <input
                id="identifier"
                type="text"
                name="identifier"
                placeholder={t("identifierPlaceholder")}
                autoComplete="username"
                value={formData.identifier}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">{t("password")}</label>
            <div className="input-wrap has-eye">
              <FaLock className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="auth-row-between">
            <Link to="/forgot-password" className="btn-link">
              {t("forgotPassword")}
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>

        <p className="auth-alt">
          {t("noAccount")}
          <Link to="/register">{t("createOne")}</Link>
        </p>
        <p className="auth-alt">
          {t("parentOrGuardian")}
          <Link to="/guardian-register">{t("guardianSignIn")}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
