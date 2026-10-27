import { useState } from "react";
import {
  FaArrowLeft,
  FaSearch,
  FaUserPlus,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./SearchUsers.css";

function SearchUsers() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const handleSearch = async () => {
    if (!search.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);

    try {
      const res = await API.get(
        `/users/search?username=${search}&userId=${user._id}`
      );

      setUsers(res.data?.users || []);
    } catch (err) {
      console.log(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (receiverId) => {
    try {
      setSendingId(receiverId);

      await API.post("/friend-request/send", {
        senderId: user._id,
        receiverId,
      });

      setUsers((prev) =>
        prev.filter((u) => u._id !== receiverId)
      );
    } catch (err) {
      console.log(err);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="search-page">

      <div className="search-header">

        <button
          className="back-btn"
          onClick={() => navigate("/home")}
        >
          <FaArrowLeft />
        </button>

        <h2>Search Users</h2>

      </div>

      <div className="search-input-box">

        <input
          type="text"
          placeholder="Search username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />

        <button onClick={handleSearch}>
          <FaSearch />
        </button>

      </div>

      <div className="users-list">

        {loading ? (
          <h3 className="status-text">
            Searching...
          </h3>
        ) : users.length === 0 ? (
          <h3 className="status-text">
            Search for a username to find users.
          </h3>
        ) : (
          users.map((u) => (
            <div
              className="user-item"
              key={u._id}
            >

              <div className="user-info">

                <div className="user-avatar">
                  {u.username
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <h3>{u.username}</h3>

                  <p>{u.email}</p>

                </div>

              </div>

              <button
                className="request-btn"
                disabled={sendingId === u._id}
                onClick={() =>
                  sendRequest(u._id)
                }
              >
                {sendingId === u._id ? (
                  "Sending..."
                ) : (
                  <>
                    <FaUserPlus />
                    Add
                  </>
                )}
              </button>

            </div>
          ))
        )}

      </div>

    </div>
  );
}

export default SearchUsers;