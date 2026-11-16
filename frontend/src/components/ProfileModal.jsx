import { useRef, useState } from "react";
import { FaCamera, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../services/api";
import Avatar from "./Avatar";
import "./ProfileModal.css";

/**
 * "My profile" popup — view your current photo and replace it.
 * Every account already has an auto-generated avatar from sign-up, so
 * this is purely for changing it to a real photo, WhatsApp-style.
 */
function ProfileModal({ isOpen, onClose, user, onUpdated }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file) return;
    try {
      setSaving(true);
      const form = new FormData();
      form.append("file", file);

      const res = await API.put("/users/profile-picture", form, {
        headers: { "Content-Type": undefined },
      });

      const updated = res.data.user;
      localStorage.setItem("user", JSON.stringify(updated));
      onUpdated?.(updated);
      toast.success("Profile picture updated.");
      setFile(null);
      setPreview(null);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update photo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-card" onClick={(e) => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>
          <FaTimes />
        </button>

        <h2>My profile</h2>

        <div className="pm-avatar-zone" onClick={() => inputRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Preview" className="pm-preview" />
          ) : (
            <Avatar src={user?.profilePic} name={user?.username} size={140} />
          )}
          <div className="pm-camera">
            <FaCamera />
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        <p className="pm-name">{user?.username}</p>
        <p className="pm-sub">{user?.email}</p>

        <button className="pm-btn" onClick={() => inputRef.current?.click()}>
          Choose photo
        </button>

        {file && (
          <button className="pm-btn pm-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save photo"}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;
