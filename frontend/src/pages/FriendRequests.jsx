import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./FriendRequests.css";

function FriendRequests() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await API.get(
        `/friend-request/received/${user._id}`
      );

      setRequests(res.data?.requests || []);
    } catch (err) {
      console.log(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (id) => {
    try {
      setProcessingId(id);

      await API.put(`/friend-request/accept/${id}`);

      setRequests((prev) =>
        prev.filter((r) => r._id !== id)
      );
    } catch (err) {
      console.log(err);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (id) => {
    try {
      setProcessingId(id);

      await API.put(`/friend-request/reject/${id}`);

      setRequests((prev) =>
        prev.filter((r) => r._id !== id)
      );
    } catch (err) {
      console.log(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="request-page">

      <div className="request-header">

        <button
          className="back-btn"
          onClick={() => navigate("/home")}
        >
          <FaArrowLeft />
        </button>

        <h2>Friend Requests</h2>

      </div>

      {loading ? (

        <h3 className="empty-text">
          Loading requests...
        </h3>

      ) : requests.length === 0 ? (

        <h3 className="empty-text">
          No pending friend requests.
        </h3>

      ) : (

        requests.map((req) => (

          <div
            key={req._id}
            className="request-card"
          >

            <div className="request-user">

              <div className="avatar">
                {req.sender?.username
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div>

                <h3>{req.sender?.username}</h3>

                <p>{req.sender?.email}</p>

              </div>

            </div>

            <div className="request-actions">

              <button
                className="accept-btn"
                disabled={processingId === req._id}
                onClick={() =>
                  acceptRequest(req._id)
                }
              >
                <FaCheck />

                {processingId === req._id
                  ? "Please wait..."
                  : "Accept"}
              </button>

              <button
                className="reject-btn"
                disabled={processingId === req._id}
                onClick={() =>
                  rejectRequest(req._id)
                }
              >
                <FaTimes />

                {processingId === req._id
                  ? "Please wait..."
                  : "Reject"}
              </button>

            </div>

          </div>

        ))

      )}

    </div>
  );
}

export default FriendRequests;