import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaLock,
  FaKey,
  FaArrowLeft,
} from "react-icons/fa";

import API from "./services/api";
import AuthLayout from "./components/AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 60;

function ForgotPassword() {
  const navigate = useNavigate();

  const [method, setMethod] = useState("email"); // "email" | "phone"
  const [step, setStep] = useState(1); // 1 = request code, 2 = enter code
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const switchMethod = (m) => {
    setMethod(m);
    setIdentifier("");
  };

  const validIdentifier = () =>
    method === "email"
      ? EMAIL_RE.test(identifier.trim())
      : identifier.replace(/\D/g, "").length >= 10;

  const sendCode = async (e) => {
    e?.preventDefault();

    if (!validIdentifier()) {
      toast.error(
        method === "email"
          ? "Enter a valid email address."
          : "Enter a valid phone number."
      );
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/users/forgot-password", {
        identifier: identifier.trim(),
      });
      toast.success(res.data.message);
      setStep(2);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send code.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await API.post("/users/reset-password", {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });
      toast.success("Password updated. Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link to="/login" className="back-link">
          <FaArrowLeft /> Back to sign in
        </Link>

        <h1>Forgot password?</h1>

        {step === 1 ? (
          <>
            <p className="subtitle">
              Choose how you'd like to receive a 6-digit verification code.
            </p>

            <form onSubmit={sendCode}>
              <div className="seg">
                <button
                  type="button"
                  className={method === "email" ? "active" : ""}
                  onClick={() => switchMethod("email")}
                >
                  <FaEnvelope /> Email
                </button>
                <button
                  type="button"
                  className={method === "phone" ? "active" : ""}
                  onClick={() => switchMethod("phone")}
                >
                  <FaPhoneAlt /> Phone (SMS)
                </button>
              </div>

              <div className="field">
                <label htmlFor="fp-identifier">
                  {method === "email"
                    ? "Registered email address"
                    : "Registered phone number"}
                </label>
                <div className="input-wrap">
                  {method === "email" ? (
                    <FaEnvelope className="input-icon" />
                  ) : (
                    <FaPhoneAlt className="input-icon" />
                  )}
                  <input
                    id="fp-identifier"
                    type={method === "email" ? "email" : "tel"}
                    placeholder={
                      method === "email" ? "you@example.com" : "9876543210"
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sending..." : "Send verification code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="subtitle">
              We sent a 6-digit code to <b>{identifier}</b>. It expires in 10
              minutes.
            </p>

            <form onSubmit={resetPassword}>
              <div className="field">
                <label htmlFor="otp">Verification code</label>
                <div className="input-wrap otp-input">
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="newPassword">New password</label>
                <div className="input-wrap">
                  <FaLock className="input-icon" />
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="confirmNewPassword">Confirm new password</label>
                <div className="input-wrap">
                  <FaKey className="input-icon" />
                  <input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Updating..." : "Reset password"}
              </button>
            </form>

            <p className="auth-alt">
              Didn't get it?
              <button
                type="button"
                className="btn-link"
                style={{ marginLeft: 6 }}
                disabled={cooldown > 0 || loading}
                onClick={sendCode}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </p>
            <p className="auth-alt" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                }}
              >
                Use a different email / phone
              </button>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;
