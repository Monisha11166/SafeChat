import { useState } from "react";
import {
  FaSearch,
  FaTimes,
  FaUserPlus,
} from "react-icons/fa";
import API from "../services/api";
import "./AddContactModal.css";

function AddContactModal({
  isOpen,
  onClose,
  onContactAdded,
}) {
  const user = JSON.parse(localStorage.getItem("user"));

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  if (!isOpen) return null;

  // ==========================
  // Search Users
  // ==========================
  const handleSearch = async () => {
    if (!search.trim()) {
      setUsers([]);
      return;
    }

    if (!user?._id) {
      alert("User information not found. Please login again.");
      return;
    }

    setLoading(true);

    try {
      const res = await API.get(
        `/users/search?username=${encodeURIComponent(
          search.trim()
        )}&userId=${user._id}`
      );

      // Backend returns:
      // { users: [...] }
      const resultUsers = Array.isArray(res.data?.users)
        ? res.data.users
        : [];

      // Extra safety: don't show current user
      const filteredUsers = resultUsers.filter(
        (u) => u._id !== user._id
      );

      setUsers(filteredUsers);
    } catch (err) {
      console.error("Search error:", err);

      setUsers([]);

      alert(
        err.response?.data?.message ||
          "Search failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Send Friend Request
  // ==========================
  const sendRequest = async (receiverId) => {
    if (!user?._id) {
      alert("User information not found. Please login again.");
      return;
    }

    if (!receiverId) {
      alert("Invalid receiver.");
      return;
    }

    try {
      setSendingId(receiverId);

      const res = await API.post(
        "/friend-request/send",
        {
          senderId: user._id,
          receiverId: receiverId,
        }
      );

      alert(
        res.data?.message ||
          "Friend request sent successfully."
      );

      // Remove user from current search results
      setUsers((prev) =>
        prev.filter(
          (u) => u._id !== receiverId
        )
      );

      setSearch("");

      // Refresh contacts in parent component
      if (onContactAdded) {
        onContactAdded();
      }

      // Close modal
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error(
        "Friend request error:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Unable to send friend request"
      );
    } finally {
      setSendingId(null);
    }
  };

  // ==========================
  // Close Modal
  // ==========================
  const handleClose = () => {
    setSearch("");
    setUsers([]);
    setLoading(false);
    setSendingId(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">

        {/* ==========================
            Header
        ========================== */}
        <div className="modal-header">
          <h2>Add Contact</h2>

          <button
            type="button"
            className="close-icon"
            onClick={handleClose}
          >
            <FaTimes />
          </button>
        </div>

        {/* ==========================
            Search
        ========================== */}
        <div className="search-area">
          <input
            type="text"
            placeholder="Search username..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
          >
            <FaSearch />
          </button>
        </div>

        {/* ==========================
            Results
        ========================== */}
        <div className="results">

          {loading ? (
            <p className="info-text">
              Searching...
            </p>
          ) : users.length === 0 ? (
            <p className="info-text">
              Search for users to add.
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u._id}
                className="user-card"
              >

                {/* User Information */}
                <div className="user-left">

                  <div className="avatar">
                    {u.username
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h4>{u.username}</h4>
                    <p>{u.email}</p>
                  </div>

                </div>

                {/* Add Button */}
                <button
                  type="button"
                  className="add-btn"
                  disabled={
                    sendingId === u._id
                  }
                  onClick={() =>
                    sendRequest(u._id)
                  }
                >
                  {sendingId === u._id ? (
                    "Sending..."
                  ) : (
                    <FaUserPlus />
                  )}
                </button>

              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}

export default AddContactModal;