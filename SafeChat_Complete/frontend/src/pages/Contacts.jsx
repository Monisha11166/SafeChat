import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaComments,
  FaSearch,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Contacts.css";

function Contacts() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await API.get(`/contacts/${user._id}`);

      const data = res.data || [];

      setContacts(data);
      setFilteredContacts(data);
    } catch (err) {
      console.log(err);
      setContacts([]);
      setFilteredContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);

    const filtered = contacts.filter((contact) =>
      contact.contactId?.username
        ?.toLowerCase()
        .includes(value.toLowerCase())
    );

    setFilteredContacts(filtered);
  };

  return (
    <div className="contacts-page">

      <div className="contacts-header">

        <button
          className="back-btn"
          onClick={() => navigate("/home")}
        >
          <FaArrowLeft />
        </button>

        <h2>My Contacts</h2>

      </div>

      <div className="search-bar">

        <FaSearch className="search-icon" />

        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) =>
            handleSearch(e.target.value)
          }
        />

      </div>

      <div className="contacts-list">

        {loading ? (

          <h3 className="empty-text">
            Loading contacts...
          </h3>

        ) : filteredContacts.length === 0 ? (

          <h3 className="empty-text">
            No contacts found.
          </h3>

        ) : (

          filteredContacts.map((contact) => {

            const friend = contact.contactId;

            return (

              <div
                key={contact._id}
                className="contact-card"
              >

                <div className="contact-left">

                  <div className="contact-avatar">
                    {friend?.username
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>

                    <h3>{friend?.username}</h3>

                    <p>{friend?.email}</p>

                  </div>

                </div>

                <button
                  className="chat-btn"
                  onClick={() => navigate("/home")}
                >
                  <FaComments />
                  Chat
                </button>

              </div>

            );

          })

        )}

      </div>

    </div>
  );
}

export default Contacts;