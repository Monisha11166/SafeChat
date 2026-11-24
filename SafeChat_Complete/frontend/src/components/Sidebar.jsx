import { useMemo, useState } from "react";
import {
  FaSearch,
  FaUserPlus,
  FaBell,
  FaChartPie,
  FaSignOutAlt,
  FaPhoneAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";
import "./Sidebar.css";
import LanguageSwitcher from "./LanguageSwitcher";
import { useT } from "../i18n/LanguageContext";

function Sidebar({
  user,
  contacts = [],
  selectedContact,
  onSelectContact,
  onAddContact,
}) {
  const navigate = useNavigate();
  const { t } = useT();

  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [me, setMe] = useState(user);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) =>
      contact.contactId?.username
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [contacts, search]);

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="sidebar">

      {/* Profile */}
      <div className="profile-section">

        <div
          className="profile-left"
          onClick={() => setProfileOpen(true)}
          style={{ cursor: "pointer" }}
          title={t("editProfilePicture")}
        >

          <Avatar src={me?.profilePic} name={me?.username} size={42} />

          <div>
            <div className="profile-name">
              {me?.username}
            </div>

            <small style={{ color: "#8696a0" }}>
              {me?.email}
            </small>
          </div>

        </div>

        <div className="profile-icons">

          <LanguageSwitcher />

          <FaChartPie
            title={t("safetyDashboard")}
            onClick={() => navigate("/dashboard")}
          />

          <FaBell
            title={t("friendRequests")}
            onClick={() => navigate("/requests")}
          />

          <FaPhoneAlt
            title={t("calls")}
            onClick={() => navigate("/calls")}
          />

          <FaUserPlus
            title={t("addContact")}
            onClick={onAddContact}
          />

          <FaSignOutAlt
            title={t("logout")}
            onClick={logout}
          />

        </div>

      </div>

      {/* Search */}

      <div className="search-container">

        <div className="search-box">

          <FaSearch color="#8696a0" />

          <input
            type="text"
            placeholder={t("searchContacts")}
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

      </div>

      {/* Contact List */}

      <div className="contacts">

        {filteredContacts.length === 0 ? (

          <div className="no-contact">
            No Contacts Found
          </div>

        ) : (

          filteredContacts.map((contact) => {

            const friend = contact.contactId;

            return (

              <div
                key={contact._id}
                className={
                  selectedContact?._id === contact._id
                    ? "contact-card active"
                    : "contact-card"
                }
                onClick={() =>
                  onSelectContact(contact)
                }
              >

                <Avatar
                  src={friend?.profilePic}
                  name={friend?.username}
                  size={44}
                  className="contact-avatar"
                />

                <div className="contact-info">

                  <div className="contact-name">
                    {friend?.username}
                  </div>

                  <div className="last-message">
                    Click to open chat
                  </div>

                </div>

                <div className="contact-time">
                  ●
                </div>

              </div>

            );

          })

        )}

      </div>

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={me}
        onUpdated={setMe}
      />

    </div>
  );
}

export default Sidebar;
